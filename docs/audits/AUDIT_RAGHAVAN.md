# Wind Data Platform - Production Audit
**Auditor:** Raghavan  
**Repo:** github.com/BHAVISHYA6/Wind-Data-platform  
**Audit Date:** 2026-06-11  
**Last Verified:** 2026-06-11 against local clone  
**Scope:** Full-stack production readiness against `docs/spec/MERN_Wind_Data_Pipeline_Short_Assignment.docx.pdf`

---

## Severity Legend
- **Critical** - Causes data corruption, runtime failure, or serious production instability.
- **High** - Spec violation, security gap, scalability blocker, or deployment blocker.
- **Medium** - Correctness, UX, maintainability, or observability issue that should be fixed before final delivery.
- **Low** - Housekeeping, cleanup, or minor consistency issue.

---

## Executive Summary

The application has a workable MERN skeleton: CSV upload, PapaParse streaming, dynamic header mapping, MongoDB persistence, a dashboard, charts, and an error-log table. However, it is **not production-ready** yet.

The biggest risks are in the ingestion contract. Some rows that should fail QC currently pass, timestamps can be stored with the wrong date or rejected during Mongo insert after validation already passed, required wind columns are not actually required, and the five-consecutive-identical-values rule is missing entirely. These must be fixed before building more frontend polish.

The original audit was mostly correct, but a few items needed correction:
- `server/.env.example` now exists, so the old "no `.env.example`" finding is no longer accurate. It is still incomplete.
- The Plotly finding was overstated. `Plotly.newPlot()` is inefficient here, but React effect cleanup calls `Plotly.purge()`, so chart ghosting is not proven.
- The CORS issue is real, but the "credentialed API calls" wording was too strong because credentials are not enabled.
- The consecutive-values finding is valid with one nuance: a tracker inside one 2,000-row batch would catch freezes within that batch; the real bug is both complete absence today and the need for state across batch boundaries.

---

## Critical Issues

### C1 - Timestamp Validation and Storage Are Inconsistent

**Files:**  
- `server/src/utils/validator.js`
- `server/src/controllers/uploadController.js`

**Spec:** Invalid timestamp or datatype must be rejected.

**Reality:** The validator accepts only `DD-MM-YYYY HH:mm` via regex:

```js
const regex = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/;
```

But storage uses JavaScript's native parser:

```js
timestamp: new Date(row.timestamp)
```

`DD-MM-YYYY HH:mm` is not a safe JavaScript 
`Date` input. In Node/V8:
- `01-02-2024 00:00` is parsed as **January 2, 2024**, not February 1.
- `13-02-2024 00:00` becomes `Invalid Date`.

**Impact:** Valid-looking CSV rows can be stored under the wrong date, sorted incorrectly in time-series charts, or fail later during database insertion after the row already passed validation. This is a data integrity issue.

**Required fix:** Create one shared timestamp parser and use it for both validation and document construction.

Recommended behavior:
- Parse `DD-MM-YYYY HH:mm` explicitly because the sample files use that format.
- Optionally accept common production formats such as ISO 8601 and `YYYY-MM-DD HH:mm`.
- Reject impossible calendar dates, not only malformed strings.
- Never call `new Date(rawCsvTimestamp)` directly for non-ISO CSV strings.

Example approach:

```js
const parseTimestamp = (value) => {
  if (isBlank(value)) return null;

  const s = String(value).trim();

  const ddmmyyyy = s.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy, hh, min] = ddmmyyyy;
    const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min)));
    const valid =
      date.getUTCFullYear() === Number(yyyy) &&
      date.getUTCMonth() === Number(mm) - 1 &&
      date.getUTCDate() === Number(dd) &&
      date.getUTCHours() === Number(hh) &&
      date.getUTCMinutes() === Number(min);
    return valid ? date : null;
  }

  const isoDate = new Date(s);
  return Number.isNaN(isoDate.getTime()) ? null : isoDate;
};
```

Then:
- `isValidDate(value)` should be `parseTimestamp(value) !== null`.
- `buildWindDataDocument()` should store `timestamp: parseTimestamp(row.timestamp)`.

---

### C2 - Wind Speed Lower Bound Is Wrong

**File:** `server/src/utils/validator.js`

**Spec:** Wind speed outside `2-60 m/s` must fail QC.

**Reality:**

```js
if (!validateRange(value, 0, 60)) {
```

**Impact:** Wind speed values from `0` to `1.99 m/s` pass validation even though the spec says they are invalid. This pollutes analytics, especially Weibull fitting, mean speed, TI, and shear calculations.

**Required fix:**

```js
if (!validateRange(value, 2, 60)) {
```

Also update the error message to say `2 and 60`.

---

### C3 - Five Consecutive Identical Wind Speed/Direction Rule Is Missing

**Files:**  
- `server/src/utils/validator.js`
- `server/src/controllers/uploadController.js`

**Spec:** "Five consecutive identical wind speed/direction values" must fail QC.

**Reality:** `validateWindTurbineRow()` validates one row at a time and has no cross-row state. There is no tracker in `processDatasetInBackground()`.

**Important nuance:** PapaParse runs row-by-row, but this code buffers 2,000 rows, pauses the parser, then processes the batch with `processBatch()`. A tracker created inside `processBatch()` would catch a freeze inside one batch, but it would miss a freeze crossing the boundary between batch 1 and batch 2, such as rows `1999-2003`.

**Impact:** Stuck sensors pass validation. This can flatten variance, suppress TI, distort Weibull fitting, and make sensor-freeze data appear healthy.

**Required fix:** Add a per-dataset consecutive tracker inside `processDatasetInBackground()` and outside `processBatch()`. Track both speed and direction fields.

```js
const consecutiveTracker = new Map();

const checkConsecutive = (fieldName, rawValue) => {
  if (isBlank(rawValue)) return false;

  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue)) return false;

  const tracker = consecutiveTracker.get(fieldName) || { lastValue: null, count: 0 };

  if (tracker.lastValue === numericValue) {
    tracker.count += 1;
  } else {
    tracker.lastValue = numericValue;
    tracker.count = 1;
  }

  consecutiveTracker.set(fieldName, tracker);
  return tracker.count >= 5;
};
```

This must not be module-level state. Module-level state would leak across concurrent uploads and datasets.

---

### C4 - Missing Required Wind Columns Are Not Detected

**File:** `server/src/utils/validator.js`

**Spec:** Missing required columns must fail validation. Missing or NaN wind speed/wind direction values must fail validation.

**Reality:** The validator dynamically discovers fields:

```js
const speedFields = fieldNames.filter(isWindSpeedField);
const directionFields = fieldNames.filter(isWindDirectionField);
```

But if no speed or direction columns are present, both arrays are empty and no error is added. A CSV with only `timestamp` can pass row validation.

**Impact:** Structurally invalid datasets can import as valid data. The dashboard then has no meaningful wind metrics, and analytics silently operate on incomplete or empty metric sets.

**Required fix:** Enforce minimum required schema after header mapping:

```js
if (speedFields.length === 0) {
  errors.push(`Row ${rowIndex + 1}: missing required wind speed column`);
}

if (directionFields.length === 0) {
  errors.push(`Row ${rowIndex + 1}: missing required wind direction column`);
}
```

Better production version: validate required columns once per dataset from the mapped header row, fail the dataset early if required columns are absent, and avoid writing one identical error per row for a structurally invalid file.

---

### C5 - Unbounded Timeseries `limit` Parameter Can Exhaust Memory

**File:** `server/src/controllers/analyticsController.js`

**Reality:**

```js
const limit = req.query.limit ? parseInt(req.query.limit, 10) : 5000;
const query = WindData.find({ datasetId }).sort({ timestamp: 1 });

if (limit > 0) {
  query.limit(limit);
}
```

**Impact:** A request such as:

```text
GET /api/analytics/timeseries?limit=99999999
```

can force MongoDB and Node.js to load far too many documents. For large datasets this can cause slow responses, memory pressure, or process termination.

**Required fix:**

```js
const DEFAULT_LIMIT = 5000;
const MAX_LIMIT = 10000;
const rawLimit = Number.parseInt(req.query.limit, 10);
const limit = Number.isInteger(rawLimit)
  ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT)
  : DEFAULT_LIMIT;
```

Also return the applied limit in response metadata so the frontend understands that results are capped.

---

## High Issues

### H1 - WebSocket Live Streaming Is Absent

**Files:** Entire server and frontend upload flow

**Spec:** The pipeline explicitly includes "WebSocket Live Streaming"; Day 9 is "WebSocket integration"; expected deliverables include real-time WebSocket updates.

**Reality:** No WebSocket implementation exists:
- No `socket.io` or `ws` dependency in `server/package.json`.
- `server/src/server.js` uses `app.listen()` directly.
- `CsvUploadModal.jsx` polls `/api/datasets/:datasetId/status` with `setInterval()` every second.

**Impact:** This is a direct spec miss. Polling works for a local demo, but it is not the required real-time streaming architecture and creates unnecessary repeated HTTP traffic.

**Required fix:** Add Socket.IO or `ws`, attach it to the HTTP server, emit dataset progress events from `processDatasetInBackground()`, and replace upload-status polling with a socket subscription.

Implementation note: pass a small progress emitter function into `processDatasetInBackground(datasetId, filePath, emitProgress)` rather than coupling controller internals directly to `req`.

---

### H2 - No Multer File Size Limit

**File:** `server/src/routes/uploadRoutes.js`

**Reality:**

```js
const upload = multer({
  storage,
  fileFilter,
});
```

**Impact:** Very large uploads can fill disk and trigger long-running background processing. Combined with unbounded analytics queries, this creates an avoidable denial-of-service surface.

**Required fix:**

```js
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024,
  },
});
```

Wrap `upload.single('file')` to return JSON `413` responses for `LIMIT_FILE_SIZE`.

---

### H3 - CORS Is Open to All Origins

**File:** `server/src/app.js`

**Reality:**

```js
app.use(cors());
```

**Impact:** Any website can call the API from a browser. Credentials are not currently enabled, so this is not a credentialed cross-origin issue today, but open upload and read access is not acceptable for production deployment.

**Required fix:**

```js
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));
```

Add `FRONTEND_URL` to `server/.env.example`.

---

### H4 - Server-Side Wind Analytics Engine Is Missing

**Files:**  
- `server/src/routes/analyticsRoutes.js`
- `server/src/controllers/analyticsController.js`
- `frontend/src/components/graph/GraphWorkspace.jsx`

**Spec:** The pipeline includes Analytics Processing before dashboard visualization:
- Missing Data Detection
- Turbulence Intensity
- Shear Analysis
- Weibull Fit

**Reality:** The server exposes only summary, timeseries, error logs, and dataset list endpoints. TI, shear, Weibull, dominant direction, and KPI analytics are computed client-side inside `GraphWorkspace.jsx`.

**Additional correctness issue:** The frontend fetches only 5,000 timeseries rows. For datasets larger than 5,000 valid rows, client-side analytics are computed on a partial sample while the UI can present them as dataset-level metrics.

**Impact:** Analytics are incomplete for large datasets, duplicated across clients, uncached, and tied to browser performance.

**Required fix:** Add server-side analytics endpoints or an `AnalyticsResult` model computed after ingestion.

Minimum endpoints:

```text
GET /api/analytics/wind-stats?datasetId=X
GET /api/analytics/weibull?datasetId=X&field=windSpeed100m
GET /api/analytics/ti?datasetId=X
GET /api/analytics/shear?datasetId=X
```

Preferred production approach: compute and persist analytics after dataset completion, then serve cached results.

---

### H5 - Error Logs Are Hardcoded to 100 With No Pagination

**File:** `server/src/controllers/analyticsController.js`

**Reality:**

```js
const errorLogs = await ErrorLog.find({ datasetId })
  .sort({ createdAt: -1 })
  .limit(100)
  .lean();
```

**Impact:** A dataset with thousands of invalid rows only shows the latest 100 errors. The error dashboard gives an incomplete QC picture and cannot support real audit/reprocessing work.

**Required fix:**

```js
const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
const limit = Math.min(500, Math.max(1, Number.parseInt(req.query.limit, 10) || 100));
const skip = (page - 1) * limit;
const total = await ErrorLog.countDocuments({ datasetId });

const errorLogs = await ErrorLog.find({ datasetId })
  .sort({ rowNumber: 1 })
  .skip(skip)
  .limit(limit)
  .lean();
```

Return `{ count, total, page, pages, data }` and add frontend pagination.

---

### H6 - `.env.example` Exists but Is Incomplete and Not Runnable

**File:** `server/.env.example`

**Original audit correction:** The old finding said `.env.example` did not exist. That is now false. The file exists.

**Reality:**

```env
PORT=5000
MONGODB_URI=Paste your MongoDB connection string here;
```

**Impact:** A developer copying this directly gets a bad MongoDB URI. Production CORS also needs `FRONTEND_URL`, and environment-specific behavior needs `NODE_ENV`.

**Required fix:**

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/wind_platform
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

Do not commit a real `.env`.

---

### H7 - No Automated Tests

**Files:** Entire repo

**Reality:** No unit/integration test files exist. Backend `npm test` is:

```json
"test": "echo \"Error: no test specified\" && exit 1"
```

**Impact:** The highest-risk logic is ingestion and QC validation, but there is no regression safety. Fixes to timestamp parsing, column mapping, range validation, and consecutive tracking can easily regress.

**Required fix:** Add focused backend tests first:
- `validator` tests for speed range, direction range, missing fields, required columns.
- timestamp parser tests for valid, invalid, ambiguous, and impossible dates.
- consecutive freeze tests including a cross-batch boundary case.
- upload integration test with a small CSV and in-memory or test MongoDB.

Frontend tests can follow after the ingestion contract is stable.

---

## Medium Issues

### M1 - Timestamp Format Support Is Too Narrow

**File:** `server/src/utils/validator.js`

**Reality:** Only `DD-MM-YYYY HH:mm` is accepted.

**Impact:** Real wind/met-mast exports often use ISO timestamps, `YYYY-MM-DD HH:mm:ss`, or slash-separated formats. The "generalized schema validation" promise is weakened if only one timestamp shape works.

**Required fix:** This should be solved as part of C1 by using one shared parser that supports a small, documented allowlist of formats. Avoid using broad `new Date()` acceptance as the validation rule.

---

### M2 - Plotly Rendering Should Use `Plotly.react()`

**File:** `frontend/src/components/chart/PlotlyWrapper.jsx`

**Original audit correction:** The old finding said old charts stack behind new charts. That is likely overstated because the effect cleanup calls `Plotly.purge()` before re-running.

**Reality:** The component calls `Plotly.newPlot()` on every dependency change:

```js
Plotly.newPlot(containerRef.current, data, layout, config);
```

**Impact:** This is inefficient and can cause unnecessary chart teardown/recreation, flicker, and performance issues during metric selection or dataset switching.

**Required fix:** Use `Plotly.react()` for updates and `Plotly.purge()` only on unmount.

---

### M3 - No Global Express JSON Error Handler

**File:** `server/src/app.js`

**Reality:** 404 responses are JSON, but there is no final `(err, req, res, next)` middleware. Errors from Multer or unexpected middleware failures can return default Express responses instead of consistent JSON.

**Impact:** The frontend expects JSON error payloads. HTML/default error responses make upload errors harder to handle cleanly.

**Required fix:**

```js
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message,
  });
});
```

This must be registered after all routes and before process exit handling.

---

### M4 - Summary API Field Names Are Inconsistent

**Files:**  
- `server/src/controllers/analyticsController.js`
- `frontend/src/services/analyticsApi.js`
- `frontend/src/data/dashboardMockData.js`

**Reality:** Server returns legacy-ish names:

```js
totalWindDataRecords
totalErrorLogRecords
averageHumidity
averageTemperature
```

Frontend normalizes them to:

```js
totalRecords
totalErrorLogs
avgHumidity
avgTemperature
```

**Impact:** The fallback works today, but the API contract is loose. Future field changes can silently produce zeroes in the dashboard.

**Required fix:** Standardize the server response shape to the frontend's canonical names and keep backward compatibility only temporarily if needed.

---

### M5 - Documentation Overclaims the Implementation

**Files:**  
- `README.md`
- `server/README.md`

**Reality:** Docs say or imply:
- 1,000-row batches, but code uses `BATCH_SIZE = 2000`.
- `setImmediate` batch yielding, but code uses PapaParse `pause()` / `resume()`.
- Backend README still describes reading whole CSV text in places, while the code streams.
- README says wind speed is bounded `0-60`, but spec says `2-60`.

**Impact:** The docs are interview/demo-facing, so inaccurate claims reduce trust and make future maintenance harder.

**Required fix:** Update docs after implementation, not before, so they describe the final actual behavior.

---

### M6 - Frontend Environment Example Is Missing

**File:** frontend config

**Reality:** `frontend/src/services/analyticsApi.js` supports:

```js
import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
```

But there is no `frontend/.env.example`.

**Impact:** Local setup works through the fallback, but deployed frontend configuration is not documented.

**Required fix:** Add:

```env
VITE_API_BASE_URL=http://localhost:5000
```

---

## Low Issues

### L1 - Temporary Upload Artifact Is Tracked

**File:** `server/upload/1779959808544-small_dataset.csv`

**Reality:** A runtime upload file is tracked in git. `server/upload/.gitkeep` is tracked but currently deleted in the working tree.

**Impact:** Runtime data should not be versioned. It can leak sample/private data and creates noisy diffs.

**Required fix:** Add:

```gitignore
server/upload/*
!server/upload/.gitkeep
```

Then remove tracked upload artifacts from git and restore `server/upload/.gitkeep`.

---

### L2 - Dead Import in Upload Controller

**File:** `server/src/controllers/uploadController.js`

**Reality:**

```js
const { mapWindTurbineCsvRows, mapHeader } = require('../utils/columnMapper');
```

`mapWindTurbineCsvRows` is not used.

**Impact:** Minor cleanup issue, but it hints at partially refactored ingestion code.

**Required fix:** Remove the unused import or reuse the shared mapper consistently.

---

### L3 - Console Debug Logging Is Left in Frontend Runtime

**Files:**  
- `frontend/src/App.jsx`
- `frontend/src/components/graph/GraphWorkspace.jsx`

**Reality:** The dashboard logs dataset IDs, field names, metric mapping, and selection state to the browser console.

**Impact:** Useful during development, noisy in production and potentially revealing dataset metadata.

**Required fix:** Gate logs behind `import.meta.env.DEV` or remove them.

---

## Remaining Spec Work

These are unimplemented or only partially implemented deliverables from the 15-day plan:

| Spec Item | Current Status |
|---|---|
| WebSocket Live Streaming / Day 9 | Missing; polling only |
| Error logging dashboard / Day 10-11 | Partial; table exists but no pagination and still says placeholder |
| TI + Shear Analysis / Day 12 | Client-only partial implementation |
| Weibull fitting + KPI dashboard / Day 13 | Client-only; no server compute/cache |
| Final dashboard integration / Day 14 | Partial; wind rose/polar direction chart not present |
| Testing and documentation / Day 15 | Tests missing; docs exist but need correction |

---

## Priority Execution Order

```text
PHASE 1 - Data correctness blockers
  C1 - Shared timestamp parser used by validation and storage
  C2 - Wind speed range changed to 2-60
  C4 - Required wind speed/direction columns enforced
  C3 - Consecutive identical speed/direction tracker across batch boundaries

PHASE 2 - API safety and deployment hygiene
  C5 - Clamp timeseries limit
  H2 - Multer file size cap and JSON upload errors
  H3 - CORS origin allowlist
  H6 - Fix server .env.example
  M3 - Global Express JSON error handler

PHASE 3 - Spec completion
  H1 - WebSocket upload progress events
  H4 - Server-side analytics engine / cached analytics result
  H5 - Error-log pagination

PHASE 4 - Verification and cleanup
  H7 - Add backend tests for parser/validator/upload
  M2 - Plotly.react() update path
  M4 - Canonical summary API shape
  M5 - Correct README/server README claims
  M6, L1, L2, L3 - Housekeeping
```

---

## Issue Count Summary

| Severity | Count |
|---|---:|
| Critical | 5 |
| High | 7 |
| Medium | 6 |
| Low | 3 |
| **Total** | **21** |

---

## Final Verdict

The project is a solid prototype and a good base for collaboration, but it needs one disciplined pass through ingestion correctness before more features are added. The safest path is to make validation/storage deterministic, prove it with tests, then complete WebSocket streaming and server-side analytics.
