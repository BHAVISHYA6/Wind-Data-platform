/**
 * Adversarial test: tries to break parseTimestamp with
 * malicious, malformed, and edge-case inputs.
 */
const { parseTimestamp } = require('../../src/utils/validator');

describe('C1 adversarial – hostile timestamp inputs', () => {
	// ── Type coercion attacks ──

	test('numeric input does not crash', () => {
		expect(parseTimestamp(12345)).toBeNull();
	});

	test('boolean input returns null', () => {
		expect(parseTimestamp(true)).toBeNull();
		expect(parseTimestamp(false)).toBeNull();
	});

	test('object input returns null', () => {
		expect(parseTimestamp({})).toBeNull();
	});

	test('array input returns null', () => {
		expect(parseTimestamp([1, 2, 3])).toBeNull();
	});

	test('NaN input returns null', () => {
		expect(parseTimestamp(NaN)).toBeNull();
	});

	test('Infinity input returns null', () => {
		expect(parseTimestamp(Infinity)).toBeNull();
	});

	// ── Injection-style strings ──

	test('SQL injection string returns null', () => {
		expect(parseTimestamp("'; DROP TABLE wind_data; --")).toBeNull();
	});

	test('script tag returns null', () => {
		expect(parseTimestamp('<script>alert(1)</script>')).toBeNull();
	});

	test('very long string returns null', () => {
		expect(parseTimestamp('A'.repeat(100000))).toBeNull();
	});

	// ── Ambiguous DD-MM vs MM-DD values ──

	test('05-06-2024 10:00 is June 5 (DD-MM), not May 6 (MM-DD)', () => {
		const result = parseTimestamp('05-06-2024 10:00');
		expect(result).toBeInstanceOf(Date);
		expect(result.getUTCMonth()).toBe(5); // June (0-indexed)
		expect(result.getUTCDate()).toBe(5);
	});

	test('12-11-2024 10:00 is November 12 (DD-MM), not December 11', () => {
		const result = parseTimestamp('12-11-2024 10:00');
		expect(result).toBeInstanceOf(Date);
		expect(result.getUTCMonth()).toBe(10); // November
		expect(result.getUTCDate()).toBe(12);
	});

	// ── Boundary dates ──

	test('31-04-2024 (April has 30 days) returns null', () => {
		expect(parseTimestamp('31-04-2024 10:00')).toBeNull();
	});

	test('30-04-2024 is valid', () => {
		const result = parseTimestamp('30-04-2024 10:00');
		expect(result).toBeInstanceOf(Date);
	});

	test('31-01-2024 (January has 31 days) is valid', () => {
		const result = parseTimestamp('31-01-2024 10:00');
		expect(result).toBeInstanceOf(Date);
	});

	// ── Format variants that should NOT match DD-MM-YYYY regex ──

	test('DD/MM/YYYY format is rejected (not ISO, not DD-MM-YYYY)', () => {
		expect(parseTimestamp('13/02/2024 10:00')).toBeNull();
	});

	test('single digit day/month does not match two-digit regex', () => {
		expect(parseTimestamp('1-2-2024 10:00')).toBeNull();
	});

	// ── Negative year ──

	test('negative year returns null', () => {
		expect(parseTimestamp('15-06--2024 10:00')).toBeNull();
	});
});
