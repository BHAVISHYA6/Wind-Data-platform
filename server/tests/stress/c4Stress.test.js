/**
 * Stress tests for C4 – required column validation under load.
 */
const { validateRequiredColumns, validateWindTurbineRow } = require('../../src/utils/validator');

describe('C4 stress – required columns under load', () => {
	test('validates 50,000 rows with missing wind columns', () => {
		let rejectedCount = 0;
		const start = performance.now();

		for (let i = 0; i < 50000; i++) {
			const result = validateWindTurbineRow({
				timestamp: '15-06-2024 10:00',
				humidity: '65',
				temperature: '25',
			}, i);

			if (!result.valid) rejectedCount++;
		}

		const elapsed = performance.now() - start;

		expect(rejectedCount).toBe(50000);
		expect(elapsed).toBeLessThan(5000);
		console.log(`C4 stress: rejected 50,000 rows (no wind cols) in ${elapsed.toFixed(2)}ms`);
	});

	test('validateRequiredColumns called 100,000 times', () => {
		const headers = ['timestamp', 'windSpeed100m', 'windDirection100m'];
		const start = performance.now();
		let validCount = 0;

		for (let i = 0; i < 100000; i++) {
			if (validateRequiredColumns(headers).valid) validCount++;
		}

		const elapsed = performance.now() - start;

		expect(validCount).toBe(100000);
		expect(elapsed).toBeLessThan(3000);
		console.log(`C4 stress: validated headers 100,000 times in ${elapsed.toFixed(2)}ms`);
	});

	test('large header lists (500 columns) validated rapidly', () => {
		const headers = Array.from({ length: 500 }, (_, i) => `col_${i}`);
		headers.push('timestamp', 'windSpeed100m', 'windDirection100m');

		const start = performance.now();
		let validCount = 0;

		for (let i = 0; i < 1000; i++) {
			if (validateRequiredColumns(headers).valid) validCount++;
		}

		const elapsed = performance.now() - start;

		expect(validCount).toBe(1000);
		expect(elapsed).toBeLessThan(15000);
		console.log(`C4 stress: 500-col headers × 1,000 checks in ${elapsed.toFixed(2)}ms`);
	});
});
