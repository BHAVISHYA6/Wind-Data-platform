/**
 * Stress test: verifies parseTimestamp performance under load
 * and consistency when called many times rapidly.
 */
const { parseTimestamp } = require('../../src/utils/validator');

describe('C1 stress – parseTimestamp under load', () => {
	test('parses 100,000 timestamps without error', () => {
		const timestamps = [];
		for (let i = 0; i < 100000; i++) {
			const dd = String((i % 28) + 1).padStart(2, '0');
			const mm = String((i % 12) + 1).padStart(2, '0');
			const yyyy = 2020 + (i % 6);
			const hh = String(i % 24).padStart(2, '0');
			const min = String(i % 60).padStart(2, '0');
			timestamps.push(`${dd}-${mm}-${yyyy} ${hh}:${min}`);
		}

		const start = performance.now();
		let successCount = 0;

		for (const ts of timestamps) {
			const result = parseTimestamp(ts);
			if (result instanceof Date) successCount++;
		}

		const elapsed = performance.now() - start;

		// All should parse successfully (we only generate valid dates)
		expect(successCount).toBe(100000);
		// Should complete in under 5 seconds
		expect(elapsed).toBeLessThan(5000);

		console.log(`Parsed 100,000 timestamps in ${elapsed.toFixed(2)}ms`);
	});

	test('handles 10,000 invalid timestamps without crashing', () => {
		const invalids = [];
		for (let i = 0; i < 10000; i++) {
			invalids.push(`99-99-9999 99:${String(i % 100).padStart(2, '0')}`);
		}

		const start = performance.now();
		let nullCount = 0;

		for (const ts of invalids) {
			if (parseTimestamp(ts) === null) nullCount++;
		}

		const elapsed = performance.now() - start;

		expect(nullCount).toBe(10000);
		expect(elapsed).toBeLessThan(3000);

		console.log(`Rejected 10,000 invalid timestamps in ${elapsed.toFixed(2)}ms`);
	});

	test('mixed valid/invalid batch consistency', () => {
		const batch = [];
		for (let i = 0; i < 50000; i++) {
			if (i % 3 === 0) {
				batch.push({ input: '31-02-2024 10:00', expectNull: true });
			} else {
				const dd = String((i % 28) + 1).padStart(2, '0');
				const mm = String((i % 12) + 1).padStart(2, '0');
				batch.push({ input: `${dd}-${mm}-2024 10:00`, expectNull: false });
			}
		}

		for (const { input, expectNull } of batch) {
			const result = parseTimestamp(input);
			if (expectNull) {
				expect(result).toBeNull();
			} else {
				expect(result).toBeInstanceOf(Date);
			}
		}
	});
});
