# Industrial Wind Telemetry & Analytics Platform 🌬️📊

The **Industrial Wind Telemetry & Analytics Platform** is an enterprise-grade, high-performance web application designed for wind farm developers, meteorologists, and data engineers. The platform processes, validates, archives, and visualizes high-frequency meteorological mast data (met mast) captured from multiple sensor arrays at varying heights.

Built with a modern tech stack (**React, Vite, Node.js, Express, and MongoDB**), this platform provides automated data cleaning pipelines, strict boundary checks, error auditing, and responsive multi-metric overlay visualization charts.

---

## 🏗️ Architectural Overview & Data Flow

Here is a simple overview of how data flows through the platform:

```text
 [Raw Met-Mast CSV] ──> (Drag & Drop UI Ingest) ──> [Express Ingestion Route]
                                                            │
                                                            ▼
                                                    (PapaParse Stream)
                                                            │
                                                            ▼
                                                   (Dynamic Column Mapper)
                                                            │
                                                            ▼
                                                  (Async Batch Validator)
                                                   /                  \
                                             (Valid Row)         (Invalid Row)
                                                 /                      \
                                                ▼                        ▼
                                     [WindData Collection]     [ErrorLog Collection]
                                      (Indexed by Dataset)      (Indexed by Dataset)
```

### The Ingestion Pipeline Workflow:
1. **Streaming Frontend Upload:** Large files are streamed through a multi-stage frontend widget that tracks progress in real-time (*Uploading file*, *Parsing CSV*, *Validating rows*, *Saving to database*, *Completed*).
2. **Dynamic Schema Normalization:** Raw headers (which vary by sensor vendor) are mapped into standardized database representations at runtime. Sensors are classified by analyzing physical units (e.g. `[m/s]`, `[°]`, `[°C]`, `[mbar]`, `[%]`).
3. **Non-Blocking Asynchronous Processing:** Rows are validated asynchronously in batches of 1,000. By using `setImmediate` to yield CPU control back to Express, the main thread remains fully responsive, preventing request timeouts on larger datasets.
4. **Isolated DB Tier:** Ingested rows are stored with a generated `datasetId`. Clean records reside in `WindData` and feed the dashboard graphs, while malformed records are quarantined in `ErrorLog` for engineers to review.

---

## ⚡ Core Engineering & Scalability Design

This platform is engineered to solve key production-level challenges encountered when handling industrial telemetry data:

* **Event-Loop Safety:** In Node.js, synchronous parsing of large CSV files blocks the event loop, causing client requests to fail. Our asynchronous batch-yielding pipeline prevents blocking, allowing concurrent API requests to process during validation.
* **Write Optimization:** Replaces slow row-by-row queries with high-performance MongoDB bulk-write operations (`insertMany` with `ordered: false`).
* **Robust Adaptability:** Handles variations in CSV column naming from different met-mast vendors. The schema resolution engine maps column headers dynamically so that any new physical metrics are automatically rendered under "Additional Metrics" without code changes.
* **Analytics Isolation:** Tagging records with a unique `datasetId` ensures aggregate computations (min, max, and averages) are run on the active dataset without cross-contamination from historical uploads.

---

## ✨ Features Checklist

### Ingestion & Pipeline
- [x] **Large File Support:** Extended request timeouts up to 120 seconds to support larger datasets.
- [x] **Dynamic Unit Mapping:** Automatic detection of wind speed `[m/s]`, wind direction `[°]`, ambient temperature `[°C]`, relative humidity `[%]`, and atmospheric pressure `[mbar]`.
- [x] **High-Performance Validation:** Immediate out-of-bounds scanning (e.g., wind speed strictly bounded between `0` and `60` m/s).
- [x] **Audit Trails:** Quarantine log tracking row numbers, error messages, and raw unmapped rows.

### Visualization & Analytics
- [x] **Fully Responsive Plots:** Plotly-React containers adjust dynamically to 100% of the viewport width.
- [x] **Multi-Metric Overlays:** Overlay multiple sensors from the same category (e.g. wind speeds at different anemometer heights) on a single time series chart.
- [x] **Real-Time Telemetry Panels:** Glassmorphic dashboard cards dynamically compute and display Min/Max telemetry bounds.
- [x] **Correlation Workspace:** Scatter plots with customizable toggle overlays for linear regression trendlines.

---

## 📂 Project Structure

```text
Wind-Data-platform/
├── README.md                  # Comprehensive root documentation
├── test_wind_data.csv         # Sample met-mast dataset for local testing
├── server/                    # Express.js REST API service
│   ├── .env.example           # Environmental configuration template
│   ├── index.js               # Entry point
│   ├── src/
│   │   ├── app.js             # Middleware and routing setup
│   │   ├── server.js          # DB connector and listener configuration
│   │   ├── config/            # Mongoose connections
│   │   ├── controllers/       # Upload and Analytics business logic
│   │   ├── models/            # Mongoose Schemas (Dataset, WindData, ErrorLog)
│   │   ├── routes/            # REST endpoint definitions
│   │   └── utils/             # Header mapping and validation logic
│   └── package.json           # Dependencies and dev scripts
└── frontend/                  # React client SPA
    ├── index.html             # HTML core page
    ├── vite.config.js         # Vite configuration
    ├── src/
    │   ├── App.jsx            # Core dashboard view controller
    │   ├── components/        # Upload forms, Plotly charts, and audit grids
    │   ├── data/              # Config layouts and theme definitions
    │   └── index.css          # Global theme styling sheet
    └── package.json           # React dependencies
```

---

## 🚀 Local Setup & Installation

Follow these instructions to run the platform locally:

### Prerequisites
- **Node.js** (v18.x or above)
- **npm** (v9.x or above)
- **MongoDB Server** (Running locally or a MongoDB Atlas URI)

---

### 1. Setup Backend Server

1. Navigate to the `server/` directory:
   ```bash
   cd server
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Open `.env` and set your MongoDB URI:
     ```env
     PORT=5000
     MONGODB_URI=YOUR_MONGODB_CONNECTION_URI
     ```

4. Launch the backend:
   - **Development mode** (with nodemon auto-restart):
     ```bash
     npm run dev
     ```
   - **Production mode**:
     ```bash
     npm start
     ```

---

### 2. Setup Frontend Client

1. Open a new terminal and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173/](http://localhost:5173/) in your web browser.

---

## 🧪 Testing with Sample Data
1. Select **Upload Dataset** from the dashboard header.
2. Drag and drop [test_wind_data.csv](file:///c:/Vayumitra/DEV/My_work/Wind-Data-platform/test_wind_data.csv) from the root project folder.
3. Observe real-time progress indicators as they move through parsing and validation.
4. Interact with the multi-line wind speed traces, correlations, and error audit panels.

---

## 🔌 API Documentation

| Endpoint | Method | Payload / Query | Description |
| :--- | :--- | :--- | :--- |
| `/api/upload` | `POST` | `multipart/form-data` | Ingests CSV dataset. Returns metrics and bench timings. |
| `/api/analytics/datasets` | `GET` | None | Lists historical datasets. |
| `/api/analytics/summary` | `GET` | `?datasetId=...` | Returns statistics (Total, Valid, Invalid, Averages). |
| `/api/analytics/timeseries` | `GET` | `?datasetId=...&limit=...` | Returns observations sorted by timestamp. |
| `/api/analytics/errorlogs` | `GET` | `?datasetId=...` | Returns validation error details. |
| `/health` | `GET` | None | Server health status check. |
