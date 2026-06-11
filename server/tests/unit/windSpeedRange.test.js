const { validateWindTurbineRow, validateRange } = require('../../src/utils/validator');

describe('C2 – Wind speed lower bound is 2 m/s', () => {
	const makeRow = (speed) => ({
		timestamp: '15-06-2024 10:00',
		windSpeed100m: String(speed),
		windDirection100m: '180',
	});

	// ── Values that must FAIL (below spec minimum of 2) ──

	test('speed 0 m/s is rejected', () => {
		const result = validateWindTurbineRow(makeRow(0), 0);
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.includes('wind speed') && e.includes('2 and 60'))).toBe(true);
	});

	test('speed 1 m/s is rejected', () => {
		const result = validateWindTurbineRow(makeRow(1), 0);
		expect(result.valid).toBe(false);
	});

	test('speed 1.99 m/s is rejected', () => {
		const result = validateWindTurbineRow(makeRow(1.99), 0);
		expect(result.valid).toBe(false);
	});

	test('speed -1 m/s is rejected', () => {
		const result = validateWindTurbineRow(makeRow(-1), 0);
		expect(result.valid).toBe(false);
	});

	// ── Values that must PASS (within 2-60) ──

	test('speed 2 m/s (lower bound) is accepted', () => {
		const result = validateWindTurbineRow(makeRow(2), 0);
		expect(result.valid).toBe(true);
	});

	test('speed 2.01 m/s is accepted', () => {
		const result = validateWindTurbineRow(makeRow(2.01), 0);
		expect(result.valid).toBe(true);
	});

	test('speed 30 m/s (mid-range) is accepted', () => {
		const result = validateWindTurbineRow(makeRow(30), 0);
		expect(result.valid).toBe(true);
	});

	test('speed 60 m/s (upper bound) is accepted', () => {
		const result = validateWindTurbineRow(makeRow(60), 0);
		expect(result.valid).toBe(true);
	});

	// ── Values above upper bound ──

	test('speed 60.01 m/s is rejected', () => {
		const result = validateWindTurbineRow(makeRow(60.01), 0);
		expect(result.valid).toBe(false);
	});

	test('speed 100 m/s is rejected', () => {
		const result = validateWindTurbineRow(makeRow(100), 0);
		expect(result.valid).toBe(false);
	});

	// ── Error message correctness ──

	test('error message says "2 and 60" not "0 and 60"', () => {
		const result = validateWindTurbineRow(makeRow(1.5), 0);
		const errorMsg = result.errors.find(e => e.includes('wind speed'));
		expect(errorMsg).toBeDefined();
		expect(errorMsg).toContain('2 and 60');
		expect(errorMsg).not.toContain('0 and 60');
	});

	// ── validateRange directly ──

	test('validateRange(1.5, 2, 60) returns false', () => {
		expect(validateRange(1.5, 2, 60)).toBe(false);
	});

	test('validateRange(2, 2, 60) returns true', () => {
		expect(validateRange(2, 2, 60)).toBe(true);
	});
});
