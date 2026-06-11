/**
 * Smoke test: quick sanity check that parseTimestamp works at all
 * after deployment / dependency changes.
 */
const { parseTimestamp, isValidDate } = require('../../src/utils/validator');

describe('C1 smoke – basic parseTimestamp sanity', () => {
	test('parseTimestamp is exported and callable', () => {
		expect(typeof parseTimestamp).toBe('function');
	});

	test('typical CSV timestamp parses without error', () => {
		const result = parseTimestamp('15-06-2025 10:30');
		expect(result).toBeInstanceOf(Date);
	});

	test('isValidDate returns boolean', () => {
		expect(typeof isValidDate('15-06-2025 10:30')).toBe('boolean');
	});

	test('null input does not throw', () => {
		expect(() => parseTimestamp(null)).not.toThrow();
	});
});
