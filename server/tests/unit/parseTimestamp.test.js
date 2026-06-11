const { parseTimestamp, isValidDate } = require('../../src/utils/validator');

describe('parseTimestamp – C1 timestamp fix', () => {
	// ── DD-MM-YYYY HH:mm (primary CSV format) ──

	test('parses DD-MM-YYYY HH:mm correctly (day > 12 proves DD-MM order)', () => {
		const result = parseTimestamp('13-02-2024 09:30');
		expect(result).toBeInstanceOf(Date);
		expect(result.getUTCDate()).toBe(13);
		expect(result.getUTCMonth()).toBe(1); // February = 1
		expect(result.getUTCFullYear()).toBe(2024);
		expect(result.getUTCHours()).toBe(9);
		expect(result.getUTCMinutes()).toBe(30);
	});

	test('parses 01-02-2024 00:00 as Feb 1 (not Jan 2)', () => {
		const result = parseTimestamp('01-02-2024 00:00');
		expect(result).toBeInstanceOf(Date);
		expect(result.getUTCDate()).toBe(1);
		expect(result.getUTCMonth()).toBe(1); // February
		expect(result.getUTCFullYear()).toBe(2024);
	});

	test('parses midnight correctly', () => {
		const result = parseTimestamp('15-06-2025 00:00');
		expect(result.getUTCHours()).toBe(0);
		expect(result.getUTCMinutes()).toBe(0);
	});

	test('parses end-of-day time', () => {
		const result = parseTimestamp('31-12-2025 23:59');
		expect(result.getUTCHours()).toBe(23);
		expect(result.getUTCMinutes()).toBe(59);
		expect(result.getUTCDate()).toBe(31);
		expect(result.getUTCMonth()).toBe(11); // December
	});

	// ── Impossible calendar dates ──

	test('rejects 31-02-2024 (Feb has no 31st)', () => {
		expect(parseTimestamp('31-02-2024 10:00')).toBeNull();
	});

	test('rejects 29-02-2023 (2023 is not a leap year)', () => {
		expect(parseTimestamp('29-02-2023 10:00')).toBeNull();
	});

	test('accepts 29-02-2024 (2024 is a leap year)', () => {
		const result = parseTimestamp('29-02-2024 10:00');
		expect(result).toBeInstanceOf(Date);
		expect(result.getUTCDate()).toBe(29);
		expect(result.getUTCMonth()).toBe(1);
	});

	test('rejects 00-01-2024 (day 0)', () => {
		expect(parseTimestamp('00-01-2024 10:00')).toBeNull();
	});

	test('rejects 15-13-2024 (month 13)', () => {
		expect(parseTimestamp('15-13-2024 10:00')).toBeNull();
	});

	test('rejects 15-00-2024 (month 0)', () => {
		expect(parseTimestamp('15-00-2024 10:00')).toBeNull();
	});

	// ── Invalid time components ──

	test('rejects hour 25', () => {
		expect(parseTimestamp('15-06-2024 25:00')).toBeNull();
	});

	test('rejects minute 60', () => {
		expect(parseTimestamp('15-06-2024 12:60')).toBeNull();
	});

	// ── ISO 8601 fallback ──

	test('accepts ISO 8601 string', () => {
		const result = parseTimestamp('2024-02-13T09:30:00Z');
		expect(result).toBeInstanceOf(Date);
		expect(result.getUTCFullYear()).toBe(2024);
		expect(result.getUTCMonth()).toBe(1);
		expect(result.getUTCDate()).toBe(13);
	});

	test('accepts YYYY-MM-DD HH:mm:ss (common variant)', () => {
		const result = parseTimestamp('2024-06-15T14:30:00');
		expect(result).toBeInstanceOf(Date);
		expect(result).not.toBeNull();
	});

	// ── Blank / null / undefined ──

	test('returns null for undefined', () => {
		expect(parseTimestamp(undefined)).toBeNull();
	});

	test('returns null for null', () => {
		expect(parseTimestamp(null)).toBeNull();
	});

	test('returns null for empty string', () => {
		expect(parseTimestamp('')).toBeNull();
	});

	test('returns null for whitespace only', () => {
		expect(parseTimestamp('   ')).toBeNull();
	});

	// ── Garbage input ──

	test('returns null for non-date string', () => {
		expect(parseTimestamp('not-a-date')).toBeNull();
	});

	test('returns null for partial date', () => {
		expect(parseTimestamp('13-02-2024')).toBeNull();
	});

	// ── Trims whitespace ──

	test('trims leading/trailing whitespace', () => {
		const result = parseTimestamp('  13-02-2024 09:30  ');
		expect(result).toBeInstanceOf(Date);
		expect(result.getUTCDate()).toBe(13);
	});
});

describe('isValidDate – delegates to parseTimestamp', () => {
	test('returns true for valid DD-MM-YYYY HH:mm', () => {
		expect(isValidDate('13-02-2024 09:30')).toBe(true);
	});

	test('returns false for impossible date', () => {
		expect(isValidDate('31-02-2024 10:00')).toBe(false);
	});

	test('returns false for blank', () => {
		expect(isValidDate('')).toBe(false);
	});

	test('returns true for ISO 8601', () => {
		expect(isValidDate('2024-02-13T09:30:00Z')).toBe(true);
	});
});
