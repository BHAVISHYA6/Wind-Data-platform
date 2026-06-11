/**
 * Adversarial tests for C2 (wind speed bounds) and C3 (consecutive tracker).
 */
const { validateWindTurbineRow, createConsecutiveTracker } = require('../../src/utils/validator');

describe('C2 adversarial – wind speed edge cases', () => {
	const makeRow = (speed) => ({
		timestamp: '15-06-2024 10:00',
		windSpeed100m: String(speed),
		windDirection100m: '180',
	});

	test('speed exactly at boundary 2.0 is accepted', () => {
		expect(validateWindTurbineRow(makeRow(2.0), 0).valid).toBe(true);
	});

	test('speed just below boundary 1.9999999 is rejected', () => {
		expect(validateWindTurbineRow(makeRow(1.9999999), 0).valid).toBe(false);
	});

	test('speed as negative zero is rejected (below 2)', () => {
		expect(validateWindTurbineRow(makeRow(-0), 0).valid).toBe(false);
	});

	test('speed as string "2" is accepted', () => {
		const result = validateWindTurbineRow({
			timestamp: '15-06-2024 10:00',
			windSpeed100m: '2',
			windDirection100m: '180',
		}, 0);
		expect(result.valid).toBe(true);
	});

	test('speed with whitespace " 5 " is accepted (isValidNumber trims)', () => {
		const result = validateWindTurbineRow({
			timestamp: '15-06-2024 10:00',
			windSpeed100m: ' 5 ',
			windDirection100m: '180',
		}, 0);
		// Number(' 5 ') => 5, which is in range
		expect(result.valid).toBe(true);
	});

	test('multiple speed fields all validate with 2-60 bound', () => {
		const result = validateWindTurbineRow({
			timestamp: '15-06-2024 10:00',
			windSpeed100m: '1.5',  // below 2 – should fail
			windSpeed80m: '3.0',   // valid
			windDirection100m: '180',
		}, 0);
		expect(result.valid).toBe(false);
		// Only windSpeed100m should have an error
		expect(result.errors.some(e => e.includes('windSpeed100m'))).toBe(true);
		expect(result.errors.some(e => e.includes('windSpeed80m'))).toBe(false);
	});
});

describe('C3 adversarial – consecutive tracker edge cases', () => {
	test('concurrent trackers do not share state', () => {
		const tracker1 = createConsecutiveTracker(5);
		const tracker2 = createConsecutiveTracker(5);

		for (let i = 0; i < 5; i++) {
			tracker1.check('windSpeed100m', '10.5');
		}

		// tracker2 should not be affected
		expect(tracker2.getCount('windSpeed100m')).toBe(0);
		expect(tracker2.check('windSpeed100m', '10.5')).toBe(false);
	});

	test('alternating values never trigger', () => {
		const tracker = createConsecutiveTracker(5);
		for (let i = 0; i < 100; i++) {
			const value = i % 2 === 0 ? '10.5' : '11.0';
			expect(tracker.check('windSpeed100m', value)).toBe(false);
		}
	});

	test('freeze at exactly threshold-1 then change does not trigger', () => {
		const tracker = createConsecutiveTracker(5);
		for (let i = 0; i < 4; i++) {
			tracker.check('windSpeed100m', '10.5');
		}
		tracker.check('windSpeed100m', '11.0'); // change before threshold
		expect(tracker.getCount('windSpeed100m')).toBe(1);
	});

	test('very small floating point differences break the streak', () => {
		const tracker = createConsecutiveTracker(5);
		tracker.check('windSpeed100m', '10.5');
		tracker.check('windSpeed100m', '10.5');
		tracker.check('windSpeed100m', '10.5');
		tracker.check('windSpeed100m', '10.5');
		// Slightly different
		tracker.check('windSpeed100m', '10.500001');
		expect(tracker.getCount('windSpeed100m')).toBe(1); // resets
	});

	test('NaN values do not count toward the streak', () => {
		const tracker = createConsecutiveTracker(3);
		tracker.check('windSpeed100m', '10.5');
		tracker.check('windSpeed100m', '10.5');
		tracker.check('windSpeed100m', 'NaN'); // not finite
		tracker.check('windSpeed100m', '10.5');
		tracker.check('windSpeed100m', '10.5');
		// Should be at count 2, not 3, because NaN broke nothing but also didn't increment
		expect(tracker.check('windSpeed100m', '10.5')).toBe(true); // 3rd after NaN gap
	});

	test('Infinity does not count', () => {
		const tracker = createConsecutiveTracker(3);
		expect(tracker.check('windSpeed100m', 'Infinity')).toBe(false);
	});

	test('large number of fields tracked simultaneously', () => {
		const tracker = createConsecutiveTracker(5);
		const fieldCount = 50;

		for (let i = 0; i < 5; i++) {
			for (let f = 0; f < fieldCount; f++) {
				tracker.check(`field_${f}`, '42');
			}
		}

		// All 50 fields should be at threshold
		for (let f = 0; f < fieldCount; f++) {
			expect(tracker.getCount(`field_${f}`)).toBe(5);
		}
	});
});
