/**
 * Integration test: simulates cross-batch consecutive value detection.
 * This is the critical C3 scenario — a sensor freeze spanning two batches
 * (e.g., rows 1998-2003 across batch boundary at row 2000).
 */
const { createConsecutiveTracker, isWindSpeedField, isWindDirectionField, validateWindTurbineRow } = require('../../src/utils/validator');

describe('C3 integration – cross-batch consecutive detection', () => {
	const makeRow = (speed, direction, timestamp) => ({
		timestamp: timestamp || '15-06-2024 10:00',
		windSpeed100m: String(speed),
		windDirection100m: String(direction),
	});

	test('detects freeze that starts in batch 1 and completes in batch 2', () => {
		const tracker = createConsecutiveTracker(5);

		// Simulate batch 1 ending with 3 identical values
		const batch1Rows = [
			makeRow(10.5, 180),
			makeRow(10.5, 180),
			makeRow(10.5, 180),
		];

		const batch1Flags = [];
		batch1Rows.forEach((row) => {
			const flagged = tracker.check('windSpeed100m', row.windSpeed100m);
			batch1Flags.push(flagged);
		});

		// None should flag in batch 1 (only 3 consecutive)
		expect(batch1Flags.every(f => f === false)).toBe(true);

		// Simulate batch 2 starting with same value
		const batch2Rows = [
			makeRow(10.5, 180),
			makeRow(10.5, 180),
			makeRow(10.5, 180),
		];

		const batch2Flags = [];
		batch2Rows.forEach((row) => {
			const flagged = tracker.check('windSpeed100m', row.windSpeed100m);
			batch2Flags.push(flagged);
		});

		// Row 4 (batch2[0]) should be false (count=4)
		expect(batch2Flags[0]).toBe(false);
		// Row 5 (batch2[1]) should be TRUE (count=5, threshold reached)
		expect(batch2Flags[1]).toBe(true);
		// Row 6 (batch2[2]) should also be TRUE (count=6)
		expect(batch2Flags[2]).toBe(true);
	});

	test('speed and direction tracked independently across batches', () => {
		const tracker = createConsecutiveTracker(5);

		// 4 identical speeds, 4 identical directions
		for (let i = 0; i < 4; i++) {
			tracker.check('windSpeed100m', '10.5');
			tracker.check('windDirection100m', '180');
		}

		// Batch 2: speed changes, direction continues
		tracker.check('windSpeed100m', '12.0'); // resets speed
		const dirFlag = tracker.check('windDirection100m', '180'); // 5th direction

		expect(tracker.getCount('windSpeed100m')).toBe(1);
		expect(dirFlag).toBe(true);
	});

	test('full pipeline: validation + consecutive check combined', () => {
		const tracker = createConsecutiveTracker(5);

		// Simulate 6 rows with same speed — first 4 pass validation normally,
		// row 5 and 6 should get consecutive errors
		const rows = Array.from({ length: 6 }, (_, i) =>
			makeRow(10.5, 180 + i, `15-06-2024 ${String(10 + i).padStart(2, '0')}:00`)
		);

		const results = rows.map((row, idx) => {
			const validationResult = validateWindTurbineRow(row, idx);
			const consecutiveErrors = [];

			Object.keys(row).filter(isWindSpeedField).forEach((fieldName) => {
				if (tracker.check(fieldName, row[fieldName])) {
					consecutiveErrors.push(
						`Row ${idx + 1}: ${fieldName} has 5+ consecutive identical values`
					);
				}
			});

			return {
				rowIndex: idx,
				validationErrors: validationResult.errors,
				consecutiveErrors,
				isValid: validationResult.errors.length === 0 && consecutiveErrors.length === 0,
			};
		});

		// Rows 0-3: valid, no consecutive flag
		for (let i = 0; i < 4; i++) {
			expect(results[i].isValid).toBe(true);
			expect(results[i].consecutiveErrors).toHaveLength(0);
		}

		// Row 4 (5th consecutive): flagged
		expect(results[4].consecutiveErrors).toHaveLength(1);
		expect(results[4].consecutiveErrors[0]).toContain('5+ consecutive');

		// Row 5 (6th consecutive): also flagged
		expect(results[5].consecutiveErrors).toHaveLength(1);
	});
});
