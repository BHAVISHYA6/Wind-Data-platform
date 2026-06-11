/**
 * Smoke tests for C2 and C3 — quick sanity checks.
 */
const { validateWindTurbineRow, createConsecutiveTracker } = require('../../src/utils/validator');

describe('C2 smoke – wind speed bound sanity', () => {
	test('speed 1 m/s is rejected (below spec minimum 2)', () => {
		const result = validateWindTurbineRow({
			timestamp: '15-06-2024 10:00',
			windSpeed100m: '1',
			windDirection100m: '180',
		}, 0);
		expect(result.valid).toBe(false);
	});

	test('speed 5 m/s is accepted', () => {
		const result = validateWindTurbineRow({
			timestamp: '15-06-2024 10:00',
			windSpeed100m: '5',
			windDirection100m: '180',
		}, 0);
		expect(result.valid).toBe(true);
	});
});

describe('C3 smoke – consecutive tracker sanity', () => {
	test('createConsecutiveTracker is exported and callable', () => {
		expect(typeof createConsecutiveTracker).toBe('function');
	});

	test('tracker returns object with check method', () => {
		const tracker = createConsecutiveTracker(5);
		expect(typeof tracker.check).toBe('function');
	});

	test('5 identical values triggers flag', () => {
		const tracker = createConsecutiveTracker(5);
		for (let i = 0; i < 4; i++) tracker.check('field', '10');
		expect(tracker.check('field', '10')).toBe(true);
	});
});
