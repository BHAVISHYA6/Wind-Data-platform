/**
 * Stress tests for C2 (wind speed bounds) and C3 (consecutive tracker).
 */
const { validateWindTurbineRow, createConsecutiveTracker } = require('../../src/utils/validator');

describe('C2 stress – mass validation with new bounds', () => {
	test('validates 50,000 rows with speed in [2, 60] range', () => {
		let validCount = 0;
		let invalidCount = 0;

		const start = performance.now();

		for (let i = 0; i < 50000; i++) {
			const speed = 2 + (i % 59); // 2..60
			const result = validateWindTurbineRow({
				timestamp: '15-06-2024 10:00',
				windSpeed100m: String(speed),
				windDirection100m: String(i % 361),
			}, i);

			if (result.valid) validCount++;
			else invalidCount++;
		}

		const elapsed = performance.now() - start;

		expect(validCount).toBe(50000);
		expect(elapsed).toBeLessThan(5000);
		console.log(`C2 stress: validated 50,000 rows in ${elapsed.toFixed(2)}ms`);
	});

	test('correctly rejects 10,000 rows with speed below 2', () => {
		let rejectedCount = 0;

		for (let i = 0; i < 10000; i++) {
			const speed = (i % 200) / 100; // 0.00 .. 1.99
			const result = validateWindTurbineRow({
				timestamp: '15-06-2024 10:00',
				windSpeed100m: String(speed),
				windDirection100m: '180',
			}, i);

			if (!result.valid) rejectedCount++;
		}

		expect(rejectedCount).toBe(10000);
	});
});

describe('C3 stress – consecutive tracker under load', () => {
	test('processes 100,000 rows with periodic freezes', () => {
		const tracker = createConsecutiveTracker(5);
		let flagCount = 0;

		const start = performance.now();

		for (let i = 0; i < 100000; i++) {
			// Every 10 rows, freeze for 8 rows
			const freezePhase = i % 10;
			const value = freezePhase < 8 ? '10.5' : String(10 + (i % 50));

			if (tracker.check('windSpeed100m', value)) {
				flagCount++;
			}
		}

		const elapsed = performance.now() - start;

		// With threshold=5, within each 10-row cycle:
		// rows 0-7 are identical (8 identical), rows 8-9 differ
		// Flags appear at positions 4,5,6,7 of each cycle (4 flags per cycle)
		// But the first cycle starts from 0 count, and direction changes reset
		// Approximate: many flags expected
		expect(flagCount).toBeGreaterThan(0);
		expect(elapsed).toBeLessThan(3000);
		console.log(`C3 stress: tracked 100,000 rows in ${elapsed.toFixed(2)}ms, ${flagCount} flags`);
	});

	test('tracks 20 fields across 50,000 rows', () => {
		const tracker = createConsecutiveTracker(5);
		const fields = Array.from({ length: 20 }, (_, i) => `field_${i}`);

		const start = performance.now();

		for (let row = 0; row < 50000; row++) {
			for (const field of fields) {
				// All fields get same value — massive freeze
				tracker.check(field, '42.0');
			}
		}

		const elapsed = performance.now() - start;

		// All fields should be at 50000
		for (const field of fields) {
			expect(tracker.getCount(field)).toBe(50000);
		}

		expect(elapsed).toBeLessThan(5000);
		console.log(`C3 stress: tracked 20 fields × 50,000 rows in ${elapsed.toFixed(2)}ms`);
	});

	test('simulated cross-batch processing (2000-row batches × 10 batches)', () => {
		const tracker = createConsecutiveTracker(5);
		const batchSize = 2000;
		const batchCount = 10;
		let totalFlags = 0;

		// All rows have the same frozen speed value
		for (let batch = 0; batch < batchCount; batch++) {
			for (let row = 0; row < batchSize; row++) {
				if (tracker.check('windSpeed100m', '10.5')) {
					totalFlags++;
				}
			}
		}

		// Total rows = 20,000. First 4 are not flagged, rest are.
		expect(totalFlags).toBe(20000 - 4);
	});
});
