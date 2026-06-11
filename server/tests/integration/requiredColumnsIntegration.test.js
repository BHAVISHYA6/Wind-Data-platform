/**
 * Integration test: verifies the full pipeline behaviour
 * when required columns are missing from a CSV-like dataset.
 */
const { validateRequiredColumns, validateWindTurbineRow, isWindSpeedField, isWindDirectionField } = require('../../src/utils/validator');
const { mapHeader } = require('../../src/utils/columnMapper');

describe('C4 integration – header mapping + required column validation', () => {
	test('raw CSV headers mapped through columnMapper are validated correctly', () => {
		// Simulate real CSV headers → mapHeader → validateRequiredColumns
		const rawHeaders = ['DateTime', '100m_N_Avg (m/s)', 'Hum_5m (%)'];
		const mappedHeaders = rawHeaders.map(mapHeader);

		const result = validateRequiredColumns(mappedHeaders);

		// Has timestamp (DateTime → timestamp) and speed (100mNavgMs → windSpeed100m)
		// but no direction column
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.includes('wind direction'))).toBe(true);
	});

	test('valid CSV headers pass after mapping', () => {
		const rawHeaders = ['DateTime', '100m_N_Avg (m/s)', 'Wind_Direction_100m'];
		const mappedHeaders = rawHeaders.map(mapHeader);

		const result = validateRequiredColumns(mappedHeaders);
		expect(result.valid).toBe(true);
	});

	test('dataset with only timestamp column: per-row validation rejects every row', () => {
		const rows = [
			{ timestamp: '15-06-2024 10:00' },
			{ timestamp: '15-06-2024 11:00' },
			{ timestamp: '15-06-2024 12:00' },
		];

		const results = rows.map((row, i) => validateWindTurbineRow(row, i));

		// Every row should fail
		results.forEach((r) => {
			expect(r.valid).toBe(false);
			expect(r.errors.some(e => e.includes('missing required wind speed'))).toBe(true);
			expect(r.errors.some(e => e.includes('missing required wind direction'))).toBe(true);
		});
	});

	test('mixed dataset: rows with and without wind columns', () => {
		// Row 0 has all columns
		const row0 = validateWindTurbineRow({
			timestamp: '15-06-2024 10:00',
			windSpeed100m: '10.5',
			windDirection100m: '180',
		}, 0);
		expect(row0.valid).toBe(true);

		// Row 1 has speed but no direction
		const row1 = validateWindTurbineRow({
			timestamp: '15-06-2024 11:00',
			windSpeed100m: '10.5',
		}, 1);
		expect(row1.valid).toBe(false);
	});

	test('early abort: validateRequiredColumns fails → no row processing needed', () => {
		const mappedHeaders = ['timestamp', 'humidity', 'temperature'];
		const headerCheck = validateRequiredColumns(mappedHeaders);

		expect(headerCheck.valid).toBe(false);

		// In a real pipeline, this would abort before processing any rows
		// Simulating that the error message is informative
		expect(headerCheck.errors.join('; ')).toContain('wind speed');
		expect(headerCheck.errors.join('; ')).toContain('wind direction');
	});
});
