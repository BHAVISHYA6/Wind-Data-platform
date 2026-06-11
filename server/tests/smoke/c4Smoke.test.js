/**
 * Smoke tests for C4 – required column detection.
 */
const { validateRequiredColumns, validateWindTurbineRow } = require('../../src/utils/validator');

describe('C4 smoke – required columns sanity', () => {
	test('validateRequiredColumns is exported and callable', () => {
		expect(typeof validateRequiredColumns).toBe('function');
	});

	test('valid headers pass', () => {
		const result = validateRequiredColumns(['timestamp', 'windSpeed100m', 'windDirection100m']);
		expect(result.valid).toBe(true);
	});

	test('empty headers fail', () => {
		const result = validateRequiredColumns([]);
		expect(result.valid).toBe(false);
	});

	test('row with no wind columns is rejected', () => {
		const result = validateWindTurbineRow({ timestamp: '15-06-2024 10:00' }, 0);
		expect(result.valid).toBe(false);
	});
});
