const { createConsecutiveTracker } = require('../../src/utils/validator');

describe('C3 – createConsecutiveTracker', () => {
	// ── Basic detection ──

	test('does not flag before reaching threshold', () => {
		const tracker = createConsecutiveTracker(5);
		for (let i = 0; i < 4; i++) {
			expect(tracker.check('windSpeed100m', '10.5')).toBe(false);
		}
	});

	test('flags on the 5th consecutive identical value', () => {
		const tracker = createConsecutiveTracker(5);
		for (let i = 0; i < 4; i++) {
			tracker.check('windSpeed100m', '10.5');
		}
		expect(tracker.check('windSpeed100m', '10.5')).toBe(true);
	});

	test('continues to flag on 6th, 7th, etc.', () => {
		const tracker = createConsecutiveTracker(5);
		for (let i = 0; i < 5; i++) {
			tracker.check('windSpeed100m', '10.5');
		}
		expect(tracker.check('windSpeed100m', '10.5')).toBe(true); // 6th
		expect(tracker.check('windSpeed100m', '10.5')).toBe(true); // 7th
	});

	// ── Reset on value change ──

	test('resets count when value changes', () => {
		const tracker = createConsecutiveTracker(5);
		for (let i = 0; i < 4; i++) {
			tracker.check('windSpeed100m', '10.5');
		}
		expect(tracker.check('windSpeed100m', '11.0')).toBe(false); // different value resets
		expect(tracker.getCount('windSpeed100m')).toBe(1);
	});

	test('flags again after a new freeze sequence', () => {
		const tracker = createConsecutiveTracker(5);
		// First freeze of 5
		for (let i = 0; i < 5; i++) {
			tracker.check('windSpeed100m', '10.5');
		}
		// Break
		tracker.check('windSpeed100m', '11.0'); // count resets to 1
		// Second freeze: need 4 more of same value to reach threshold=5
		for (let i = 0; i < 3; i++) {
			expect(tracker.check('windSpeed100m', '8.0')).toBe(false); // counts 2, 3, 4
		}
		// 5th of new value (1 from break-change + 4 checks of '8.0' ... wait, '11.0' was the break)
		// After break: check('8.0') → count=1, then 3 more → count=4
		// Need one more to reach 5
		expect(tracker.check('windSpeed100m', '8.0')).toBe(false); // count=4 still (count was: 11.0→1, 8.0→1,2,3,4)
		expect(tracker.check('windSpeed100m', '8.0')).toBe(true);  // count=5 → flagged!
	});

	// ── Independent field tracking ──

	test('tracks fields independently', () => {
		const tracker = createConsecutiveTracker(5);
		for (let i = 0; i < 5; i++) {
			tracker.check('windSpeed100m', '10.5');
			tracker.check('windSpeed80m', '8.0');
		}
		// windSpeed100m should flag
		expect(tracker.getCount('windSpeed100m')).toBe(5);
		// windSpeed80m should also flag independently
		expect(tracker.getCount('windSpeed80m')).toBe(5);
	});

	test('one field changing does not affect another', () => {
		const tracker = createConsecutiveTracker(5);
		for (let i = 0; i < 4; i++) {
			tracker.check('windSpeed100m', '10.5');
			tracker.check('windDirection100m', '180');
		}
		// Change speed but not direction
		tracker.check('windSpeed100m', '12.0');
		tracker.check('windDirection100m', '180');

		expect(tracker.getCount('windSpeed100m')).toBe(1);
		expect(tracker.getCount('windDirection100m')).toBe(5);
	});

	// ── Blank / non-numeric values ──

	test('blank values return false and do not affect count', () => {
		const tracker = createConsecutiveTracker(5);
		for (let i = 0; i < 3; i++) {
			tracker.check('windSpeed100m', '10.5');
		}
		expect(tracker.check('windSpeed100m', '')).toBe(false);
		// Count should still be 3 from before
		expect(tracker.getCount('windSpeed100m')).toBe(3);
	});

	test('non-numeric values return false', () => {
		const tracker = createConsecutiveTracker(5);
		expect(tracker.check('windSpeed100m', 'abc')).toBe(false);
	});

	test('null values return false', () => {
		const tracker = createConsecutiveTracker(5);
		expect(tracker.check('windSpeed100m', null)).toBe(false);
	});

	test('undefined values return false', () => {
		const tracker = createConsecutiveTracker(5);
		expect(tracker.check('windSpeed100m', undefined)).toBe(false);
	});

	// ── Custom threshold ──

	test('respects custom threshold of 3', () => {
		const tracker = createConsecutiveTracker(3);
		tracker.check('windSpeed100m', '10.5');
		tracker.check('windSpeed100m', '10.5');
		expect(tracker.check('windSpeed100m', '10.5')).toBe(true);
	});

	test('threshold of 1 always flags', () => {
		const tracker = createConsecutiveTracker(1);
		expect(tracker.check('windSpeed100m', '10.5')).toBe(true);
	});

	// ── Reset ──

	test('reset() clears all state', () => {
		const tracker = createConsecutiveTracker(5);
		for (let i = 0; i < 4; i++) {
			tracker.check('windSpeed100m', '10.5');
		}
		tracker.reset();
		expect(tracker.getCount('windSpeed100m')).toBe(0);
		// After reset, counting starts fresh
		expect(tracker.check('windSpeed100m', '10.5')).toBe(false);
	});

	// ── Numeric equivalence ──

	test('treats "10.50" and "10.5" as the same value', () => {
		const tracker = createConsecutiveTracker(3);
		tracker.check('windSpeed100m', '10.50');
		tracker.check('windSpeed100m', '10.5');
		expect(tracker.check('windSpeed100m', '10.500')).toBe(true);
	});

	test('treats "0" and "0.0" as the same value', () => {
		const tracker = createConsecutiveTracker(2);
		tracker.check('windDirection100m', '0');
		expect(tracker.check('windDirection100m', '0.0')).toBe(true);
	});
});
