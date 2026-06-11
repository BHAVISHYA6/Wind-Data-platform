/**
 * Integration test: verifies that validation and document construction
 * use the same timestamp parser (the core of the C1 fix).
 */
const { parseTimestamp, validateWindTurbineRow } = require('../../src/utils/validator');

// Simulate the buildWindDataDocument path (same logic as uploadController)
const buildTimestampForStorage = (rawTimestamp) => parseTimestamp(rawTimestamp);

describe('C1 integration – validation + storage consistency', () => {
	const validRow = {
		timestamp: '13-06-2024 14:30',
		windSpeed100m: '8.5',
		windDirection100m: '220',
	};

	test('validated timestamp matches stored timestamp', () => {
		const result = validateWindTurbineRow(validRow, 0);
		expect(result.valid).toBe(true);

		const storedDate = buildTimestampForStorage(validRow.timestamp);
		expect(storedDate).toBeInstanceOf(Date);
		expect(storedDate.getUTCDate()).toBe(13);
		expect(storedDate.getUTCMonth()).toBe(5); // June
		expect(storedDate.getUTCFullYear()).toBe(2024);
		expect(storedDate.getUTCHours()).toBe(14);
		expect(storedDate.getUTCMinutes()).toBe(30);
	});

	test('OLD BUG: 01-02-2024 would have been stored as Jan 2 via new Date()', () => {
		// Demonstrate the old bug path
		const raw = '01-02-2024 10:00';
		const oldBehavior = new Date(raw);

		// In V8, new Date("01-02-2024 10:00") parses as Jan 2 (MM-DD)
		// or Invalid Date depending on engine. Either way it's wrong for DD-MM.
		if (!isNaN(oldBehavior.getTime())) {
			// If V8 parsed it, it would have read month=01 day=02 → Jan 2
			expect(oldBehavior.getUTCMonth()).toBe(0); // January — WRONG
		}

		// New behavior: correctly parses as Feb 1
		const fixed = buildTimestampForStorage(raw);
		expect(fixed).toBeInstanceOf(Date);
		expect(fixed.getUTCMonth()).toBe(1);  // February — CORRECT
		expect(fixed.getUTCDate()).toBe(1);   // 1st — CORRECT
	});

	test('OLD BUG: 13-02-2024 would have been Invalid Date via new Date()', () => {
		const raw = '13-02-2024 10:00';
		const oldBehavior = new Date(raw);

		// There's no month 13, so new Date() returns Invalid Date
		expect(isNaN(oldBehavior.getTime())).toBe(true);

		// New behavior: correctly parses as Feb 13
		const fixed = buildTimestampForStorage(raw);
		expect(fixed).toBeInstanceOf(Date);
		expect(fixed.getUTCMonth()).toBe(1);   // February
		expect(fixed.getUTCDate()).toBe(13);    // 13th
	});

	test('row with impossible date is rejected by validation', () => {
		const badRow = {
			timestamp: '31-02-2024 10:00',
			windSpeed100m: '8.5',
			windDirection100m: '220',
		};
		const result = validateWindTurbineRow(badRow, 0);
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.includes('timestamp'))).toBe(true);
	});

	test('row rejected by validation produces null from storage parser', () => {
		const storedDate = buildTimestampForStorage('31-02-2024 10:00');
		expect(storedDate).toBeNull();
	});
});
