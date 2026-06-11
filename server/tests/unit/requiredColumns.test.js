const { validateWindTurbineRow, validateRequiredColumns } = require('../../src/utils/validator');

describe('C4 – validateRequiredColumns (dataset-level check)', () => {
	test('valid headers with speed + direction + timestamp pass', () => {
		const result = validateRequiredColumns(['timestamp', 'windSpeed100m', 'windDirection100m']);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('missing wind speed column fails', () => {
		const result = validateRequiredColumns(['timestamp', 'windDirection100m']);
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.includes('wind speed'))).toBe(true);
	});

	test('missing wind direction column fails', () => {
		const result = validateRequiredColumns(['timestamp', 'windSpeed100m']);
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.includes('wind direction'))).toBe(true);
	});

	test('missing timestamp column fails', () => {
		const result = validateRequiredColumns(['windSpeed100m', 'windDirection100m']);
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.includes('timestamp'))).toBe(true);
	});

	test('empty headers fail with all three errors', () => {
		const result = validateRequiredColumns([]);
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(3);
	});

	test('only timestamp fails with two missing column errors', () => {
		const result = validateRequiredColumns(['timestamp']);
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(2);
	});

	test('default (no arg) fails with all errors', () => {
		const result = validateRequiredColumns();
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(3);
	});

	// ── Alias detection ──

	test('recognizes aliased speed column names (e.g. "100mNavgMs")', () => {
		// After mapHeader, "100mNavgMs" → "windSpeed100m"
		const result = validateRequiredColumns(['timestamp', 'windSpeed100m', 'windDirection100m']);
		expect(result.valid).toBe(true);
	});

	test('recognizes "avgms" in column name as speed', () => {
		const result = validateRequiredColumns(['timestamp', 'avgms100m', 'windDirection100m']);
		expect(result.valid).toBe(true);
	});

	test('recognizes "direction" in column name', () => {
		const result = validateRequiredColumns(['timestamp', 'windSpeed100m', 'direction80m']);
		expect(result.valid).toBe(true);
	});

	// ── Extra columns don't break it ──

	test('extra columns (humidity, temperature) do not affect required check', () => {
		const result = validateRequiredColumns([
			'timestamp', 'windSpeed100m', 'windDirection100m',
			'humidity', 'temperature', 'extraColumn',
		]);
		expect(result.valid).toBe(true);
	});
});

describe('C4 – validateWindTurbineRow per-row guard', () => {
	test('row with only timestamp is rejected (no wind columns)', () => {
		const result = validateWindTurbineRow({
			timestamp: '15-06-2024 10:00',
		}, 0);
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.includes('missing required wind speed'))).toBe(true);
		expect(result.errors.some(e => e.includes('missing required wind direction'))).toBe(true);
	});

	test('row with timestamp + speed but no direction is rejected', () => {
		const result = validateWindTurbineRow({
			timestamp: '15-06-2024 10:00',
			windSpeed100m: '10.5',
		}, 0);
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.includes('missing required wind direction'))).toBe(true);
	});

	test('row with timestamp + direction but no speed is rejected', () => {
		const result = validateWindTurbineRow({
			timestamp: '15-06-2024 10:00',
			windDirection100m: '180',
		}, 0);
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.includes('missing required wind speed'))).toBe(true);
	});

	test('row with all required columns passes', () => {
		const result = validateWindTurbineRow({
			timestamp: '15-06-2024 10:00',
			windSpeed100m: '10.5',
			windDirection100m: '180',
		}, 0);
		expect(result.valid).toBe(true);
	});

	test('empty row produces timestamp + speed + direction errors', () => {
		const result = validateWindTurbineRow({}, 0);
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThanOrEqual(3);
	});

	test('row with unrecognized columns only is rejected', () => {
		const result = validateWindTurbineRow({
			timestamp: '15-06-2024 10:00',
			someRandomField: '42',
			anotherField: '99',
		}, 0);
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.includes('missing required wind speed'))).toBe(true);
		expect(result.errors.some(e => e.includes('missing required wind direction'))).toBe(true);
	});
});
