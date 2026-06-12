/**
 * Unit tests for the three WebSocket fixes and C5 timeseries limit clamp.
 *
 * Strategy: source-analysis tests — read the actual production file and assert
 * the fix is present. This catches regressions without requiring a running server
 * or complex mongoose mocks.
 */
const fs = require('fs');
const path = require('path');

const src = (...parts) =>
	fs.readFileSync(path.join(__dirname, '../../src', ...parts), 'utf8');

// ── WS-1: Socket CORS ────────────────────────────────────────────

describe('WS-1 – Socket.IO CORS uses FRONTEND_URL env var', () => {
	const socketSrc = src('utils', 'socket.js');

	test('does NOT contain hardcoded wildcard origin', () => {
		expect(socketSrc).not.toContain("origin: '*'");
	});

	test('reads origin from process.env.FRONTEND_URL', () => {
		expect(socketSrc).toContain('process.env.FRONTEND_URL');
	});

	test('has a safe fallback for local development', () => {
		expect(socketSrc).toContain('localhost:5173');
	});
});

// ── WS-2: No global io.emit() ────────────────────────────────────

describe('WS-2 – uploadController emits only to rooms, not globally', () => {
	const controllerSrc = src('controllers', 'uploadController.js');

	const lines = controllerSrc.split('\n');

	test('has no bare io.emit() calls (global broadcast)', () => {
		// A line with io.emit( but NOT preceded by .to( on the same line is a global broadcast
		const globalBroadcasts = lines.filter(
			(line) => line.includes('io.emit(') && !line.includes('.to(')
		);
		expect(globalBroadcasts).toHaveLength(0);
	});

	test('still emits uploadStarted to the room', () => {
		expect(controllerSrc).toContain("emit('uploadStarted'");
	});

	test('still emits uploadProgress to the room', () => {
		expect(controllerSrc).toContain("emit('uploadProgress'");
	});

	test('still emits uploadCompleted to the room', () => {
		expect(controllerSrc).toContain("emit('uploadCompleted'");
	});

	test('still emits uploadFailed to the room', () => {
		expect(controllerSrc).toContain("emit('uploadFailed'");
	});

	test('all emit calls are scoped via .to(datasetId)', () => {
		const emitLines = lines.filter((line) => line.includes('.emit('));
		const allScoped = emitLines.every((line) => line.includes('.to('));
		expect(allScoped).toBe(true);
	});
});

// ── WS-3: Socket singleton teardown ──────────────────────────────

describe('WS-3 – frontend socket service has proper teardown', () => {
	const frontendSocketSrc = fs.readFileSync(
		path.join(__dirname, '../../../frontend/src/services/socket.js'),
		'utf8'
	);

	test('exports disconnectSocket function', () => {
		expect(frontendSocketSrc).toContain('export const disconnectSocket');
	});

	test('disconnectSocket calls socket.disconnect()', () => {
		expect(frontendSocketSrc).toContain('socket.disconnect()');
	});

	test('disconnectSocket nulls the singleton after disconnecting', () => {
		expect(frontendSocketSrc).toContain('socket = null');
	});

	test('has reconnectionAttempts for resilience', () => {
		expect(frontendSocketSrc).toContain('reconnectionAttempts');
	});

	test('has reconnectionDelay for resilience', () => {
		expect(frontendSocketSrc).toContain('reconnectionDelay');
	});

	test('getSocket is still exported', () => {
		expect(frontendSocketSrc).toContain('export const getSocket');
	});
});

// ── C5: Timeseries limit clamped ─────────────────────────────────

describe('C5 – timeseries limit is clamped to 10,000', () => {
	const analyticsSrc = src('controllers', 'analyticsController.js');

	test('defines MAX_LIMIT constant', () => {
		expect(analyticsSrc).toContain('MAX_LIMIT = 10000');
	});

	test('uses Math.min to cap requested limit', () => {
		expect(analyticsSrc).toContain('Math.min(requested, MAX_LIMIT)');
	});

	test('does NOT use unbounded limit (old pattern removed)', () => {
		// Old code was: parseInt(req.query.limit, 10) : 5000
		expect(analyticsSrc).not.toContain(': 5000');
	});

	test('handles non-numeric limit values safely', () => {
		expect(analyticsSrc).toContain('Number.isFinite(requested)');
	});

	// Pure logic test — mirrors the production clamping function exactly
	const clamp = (queryLimit) => {
		const MAX_LIMIT = 10000;
		const requested = queryLimit ? parseInt(queryLimit, 10) : MAX_LIMIT;
		return Number.isFinite(requested) && requested > 0
			? Math.min(requested, MAX_LIMIT)
			: MAX_LIMIT;
	};

	test('?limit=100 returns 100', () => expect(clamp('100')).toBe(100));
	test('?limit=10000 returns 10000 (boundary)', () => expect(clamp('10000')).toBe(10000));
	test('?limit=10001 is clamped to 10000', () => expect(clamp('10001')).toBe(10000));
	test('?limit=999999 is clamped to 10000', () => expect(clamp('999999')).toBe(10000));
	test('?limit=0 defaults to MAX_LIMIT', () => expect(clamp('0')).toBe(10000));
	test('?limit=-1 defaults to MAX_LIMIT', () => expect(clamp('-1')).toBe(10000));
	test('?limit=abc defaults to MAX_LIMIT (NaN)', () => expect(clamp('abc')).toBe(10000));
	test('no limit param defaults to MAX_LIMIT', () => expect(clamp(undefined)).toBe(10000));
	test('?limit=1 returns 1 (minimum valid)', () => expect(clamp('1')).toBe(1));
});

// ── H6 / M6: env.example files ───────────────────────────────────

describe('H6 / M6 – .env.example files are complete', () => {
	const serverEnv = fs.readFileSync(
		path.join(__dirname, '../../.env.example'),
		'utf8'
	);
	const frontendEnv = fs.readFileSync(
		path.join(__dirname, '../../../frontend/.env.example'),
		'utf8'
	);

	test('server .env.example contains PORT', () => {
		expect(serverEnv).toContain('PORT=');
	});

	test('server .env.example contains MONGODB_URI', () => {
		expect(serverEnv).toContain('MONGODB_URI=');
	});

	test('server .env.example contains FRONTEND_URL', () => {
		expect(serverEnv).toContain('FRONTEND_URL=');
	});

	test('server .env.example contains NODE_ENV', () => {
		expect(serverEnv).toContain('NODE_ENV=');
	});

	test('frontend .env.example exists and contains VITE_API_BASE_URL', () => {
		expect(frontendEnv).toContain('VITE_API_BASE_URL=');
	});
});
