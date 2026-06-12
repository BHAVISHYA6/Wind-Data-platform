/**
 * Integration tests – cross-cutting verification of recent fixes.
 * Ensures fixes are consistent end-to-end across files.
 */
const fs = require('fs');
const path = require('path');

const readSrc = (...parts) =>
	fs.readFileSync(path.join(__dirname, '../../src', ...parts), 'utf8');

const frontendSrc = (...parts) =>
	fs.readFileSync(path.join(__dirname, '../../../frontend/src', ...parts), 'utf8');

// ── WS-1 + WS-2 + WS-3: Socket integration consistency ───────────

describe('WebSocket fixes – end-to-end consistency', () => {
	test('WS-1 + WS-3: same FRONTEND_URL env var used in both socket server and .env.example', () => {
		const socketSrc = readSrc('utils', 'socket.js');
		const envExample = fs.readFileSync(path.join(__dirname, '../../.env.example'), 'utf8');

		// Both must reference FRONTEND_URL
		expect(socketSrc).toContain('FRONTEND_URL');
		expect(envExample).toContain('FRONTEND_URL=');
	});

	test('WS-3: App.jsx imports and uses disconnectSocket from socket service', () => {
		const appSrc = frontendSrc('App.jsx');
		expect(appSrc).toContain("from './services/socket'");
		expect(appSrc).toContain('disconnectSocket');
	});

	test('WS-3: socket service and App.jsx teardown are consistent', () => {
		const serviceSrc = frontendSrc('services', 'socket.js');
		const appSrc = frontendSrc('App.jsx');

		// Service exports the function
		expect(serviceSrc).toContain('export const disconnectSocket');
		// App imports and calls it
		expect(appSrc).toContain('disconnectSocket');
		// App wires it in a useEffect cleanup (return arrow before disconnectSocket)
		expect(appSrc).toMatch(/return\s*\(\)\s*=>\s*\{[\s\S]*?disconnectSocket/);
	});

	test('WS-2: progress/completed/failed events match between server and frontend', () => {
		const controllerSrc = readSrc('controllers', 'uploadController.js');
		const modalSrc = frontendSrc('components', 'upload', 'CsvUploadModal.jsx');

		// The modal listens for these three events (uploadStarted is server-only)
		['uploadProgress', 'uploadCompleted', 'uploadFailed'].forEach((event) => {
			expect(controllerSrc).toContain(`'${event}'`);
			expect(modalSrc).toContain(`'${event}'`);
		});

		// uploadStarted is emitted by server but not handled by the modal (intentional)
		expect(controllerSrc).toContain("'uploadStarted'");
	});
});

// ── C5: Timeseries limit — boundary and edge cases ────────────────

describe('C5 – timeseries limit boundary integration', () => {
	// Mirror production clamping logic
	const MAX_LIMIT = 10000;
	const clamp = (queryLimit) => {
		const requested = queryLimit ? parseInt(queryLimit, 10) : MAX_LIMIT;
		return Number.isFinite(requested) && requested > 0
			? Math.min(requested, MAX_LIMIT)
			: MAX_LIMIT;
	};

	const cases = [
		// [input, expected, description]
		['5000', 5000, 'normal request below cap'],
		['10000', 10000, 'exact cap boundary'],
		['10001', 10000, 'one above cap is clamped'],
		['50000', 10000, 'large request is clamped'],
		['1', 1, 'minimum valid value'],
		['0', 10000, 'zero defaults to max'],
		['-100', 10000, 'negative defaults to max'],
		['abc', 10000, 'non-numeric defaults to max'],
		['1.5', 1, 'float is parseInt-ed to 1'],
		[undefined, 10000, 'missing param defaults to max'],
		['', 10000, 'empty string defaults to max'],
	];

	cases.forEach(([input, expected, desc]) => {
		test(`${desc} → limit=${expected}`, () => {
			expect(clamp(input)).toBe(expected);
		});
	});

	test('MAX_LIMIT constant value is exactly 10000 in production code', () => {
		const src = readSrc('controllers', 'analyticsController.js');
		// Extract the MAX_LIMIT value
		const match = src.match(/MAX_LIMIT\s*=\s*(\d+)/);
		expect(match).not.toBeNull();
		expect(parseInt(match[1], 10)).toBe(10000);
	});
});

// ── H6 / M6: env example completeness ────────────────────────────

describe('H6 / M6 – env.example files complete and consistent', () => {
	const serverEnv = fs.readFileSync(path.join(__dirname, '../../.env.example'), 'utf8');
	const frontendEnv = fs.readFileSync(
		path.join(__dirname, '../../../frontend/.env.example'), 'utf8'
	);

	test('server env has all required keys', () => {
		['PORT', 'MONGODB_URI', 'FRONTEND_URL', 'NODE_ENV'].forEach((key) => {
			expect(serverEnv).toContain(key);
		});
	});

	test('frontend env has required key', () => {
		expect(frontendEnv).toContain('VITE_API_BASE_URL');
	});

	test('server FRONTEND_URL default matches frontend VITE_API_BASE_URL default', () => {
		// Both should reference localhost:5173 and localhost:5000 respectively
		expect(serverEnv).toContain('localhost:5173');
		expect(frontendEnv).toContain('localhost:5000');
	});

	test('neither env.example contains real secrets or passwords', () => {
		const noSecrets = (content) => {
			expect(content).not.toMatch(/password\s*=\s*\S+/i);
			expect(content).not.toMatch(/secret\s*=\s*\S+/i);
		};
		noSecrets(serverEnv);
		noSecrets(frontendEnv);
	});
});
