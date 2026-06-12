/**
 * Smoke tests – fast sanity checks for all recent fixes.
 * Each test is one assertion; if any fail the fix has regressed.
 */
const fs = require('fs');
const path = require('path');

const readSrc = (...parts) =>
	fs.readFileSync(path.join(__dirname, '../../src', ...parts), 'utf8');

test('WS-1: socket.js has no wildcard CORS', () => {
	expect(readSrc('utils', 'socket.js')).not.toContain("origin: '*'");
});

test('WS-2: uploadController.js has no global io.emit()', () => {
	const lines = readSrc('controllers', 'uploadController.js').split('\n');
	expect(lines.filter((l) => l.includes('io.emit(') && !l.includes('.to('))).toHaveLength(0);
});

test('WS-3: frontend socket exports disconnectSocket', () => {
	const src = fs.readFileSync(
		path.join(__dirname, '../../../frontend/src/services/socket.js'), 'utf8'
	);
	expect(src).toContain('export const disconnectSocket');
});

test('C5: analyticsController caps limit at 10000', () => {
	expect(readSrc('controllers', 'analyticsController.js')).toContain('MAX_LIMIT = 10000');
});

test('H6: server .env.example has FRONTEND_URL', () => {
	expect(fs.readFileSync(path.join(__dirname, '../../.env.example'), 'utf8')).toContain('FRONTEND_URL=');
});

test('M6: frontend .env.example exists', () => {
	expect(fs.existsSync(path.join(__dirname, '../../../frontend/.env.example'))).toBe(true);
});
