const isBlank = (value) => {
	return (
		value === undefined ||
		value === null ||
		String(value).trim() === ''
	);
};

/**
 * Shared timestamp parser used by both validation and document construction.
 * Returns a valid Date object or null.
 *
 * Supported formats:
 *   - DD-MM-YYYY HH:mm  (primary CSV format)
 *   - ISO 8601 / YYYY-MM-DD variants
 */
const parseTimestamp = (value) => {
	if (isBlank(value)) return null;

	// Only accept string inputs — reject numbers, arrays, objects, etc.
	if (typeof value !== 'string') return null;

	const s = value.trim();

	// Try DD-MM-YYYY HH:mm first (primary CSV format)
	const ddmmyyyy = s.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/);
	if (ddmmyyyy) {
		const [, dd, mm, yyyy, hh, min] = ddmmyyyy;
		const date = new Date(
			Date.UTC(
				Number(yyyy),
				Number(mm) - 1,
				Number(dd),
				Number(hh),
				Number(min)
			)
		);
		// Validate that the calendar date components round-trip correctly
		// (rejects impossible dates like 31-02-2024)
		const valid =
			date.getUTCFullYear() === Number(yyyy) &&
			date.getUTCMonth() === Number(mm) - 1 &&
			date.getUTCDate() === Number(dd) &&
			date.getUTCHours() === Number(hh) &&
			date.getUTCMinutes() === Number(min);
		return valid ? date : null;
	}

	// Fallback: accept ISO 8601 variants (must start with YYYY- pattern)
	if (/^\d{4}-\d{2}/.test(s)) {
		const isoDate = new Date(s);
		return Number.isNaN(isoDate.getTime()) ? null : isoDate;
	}

	return null;
};

const isValidDate = (value) => {
	return parseTimestamp(value) !== null;
};

const isValidNumber = (value) => {
	if (isBlank(value)) {
		return false;
	}

	const numberValue = Number(value);

	return Number.isFinite(numberValue);
};

const normalizeFieldName = (fieldName) => {
	return String(fieldName)
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
};

const isWindSpeedField = (fieldName) => {
	const normalizedFieldName =
		normalizeFieldName(fieldName);

	return (
		normalizedFieldName.includes('windspeed') ||
		normalizedFieldName.includes('avgms') ||
		normalizedFieldName.includes('speed')
	);
};

const isWindDirectionField = (fieldName) => {
	const normalizedFieldName =
		normalizeFieldName(fieldName);

	return (
		normalizedFieldName.includes('winddirection') ||
		normalizedFieldName.includes('wv') ||
		normalizedFieldName.includes('direction')
	);
};

const validateRange = (value, min, max) => {
	if (!isValidNumber(value)) {
		return false;
	}

	const numericValue = Number(value);

	return (
		numericValue >= min &&
		numericValue <= max
	);
};

const buildMissingValueError = (
	rowIndex,
	fieldName
) => {
	return `Row ${
		rowIndex + 1
	}: ${fieldName} is missing`;
};

const buildRangeError = (
	rowIndex,
	fieldName,
	min,
	max,
	value,
	label
) => {
	return `Row ${
		rowIndex + 1
	}: ${label} ${fieldName} must be between ${min} and ${max} (${value})`;
};

const validateWindTurbineRow = (
	row = {},
	rowIndex = 0
) => {
	const errors = [];

	const fieldNames = Object.keys(row);

	const timestampValue = row.timestamp;

	// Timestamp validation
	if (isBlank(timestampValue)) {
		errors.push(
			buildMissingValueError(
				rowIndex,
				'timestamp'
			)
		);
	} else if (!isValidDate(timestampValue)) {
		errors.push(
			`Row ${
				rowIndex + 1
			}: timestamp format invalid`
		);
	}

	// Dynamic wind field detection
	const speedFields =
		fieldNames.filter(isWindSpeedField);

	const directionFields = fieldNames.filter(
		isWindDirectionField
	);

	// C4: Reject rows that have no wind speed or direction columns
	if (speedFields.length === 0) {
		errors.push(
			`Row ${rowIndex + 1}: missing required wind speed column`
		);
	}

	if (directionFields.length === 0) {
		errors.push(
			`Row ${rowIndex + 1}: missing required wind direction column`
		);
	}

	// Wind speed validation (spec: 2–60 m/s)
	speedFields.forEach((fieldName) => {
		const value = row[fieldName];

		if (isBlank(value)) {
			errors.push(
				buildMissingValueError(
					rowIndex,
					fieldName
				)
			);

			return;
		}

		if (!validateRange(value, 2, 60)) {
			errors.push(
				buildRangeError(
					rowIndex,
					fieldName,
					2,
					60,
					value,
					'wind speed'
				)
			);
		}
	});

	// Wind direction validation
	directionFields.forEach((fieldName) => {
		const value = row[fieldName];

		if (isBlank(value)) {
			errors.push(
				buildMissingValueError(
					rowIndex,
					fieldName
				)
			);

			return;
		}

		if (!validateRange(value, 0, 360)) {
			errors.push(
				buildRangeError(
					rowIndex,
					fieldName,
					0,
					360,
					value,
					'wind direction'
				)
			);
		}
	});

	return {
		valid: errors.length === 0,
		errors,
	};
};

const validateWindTurbineCsv = (
	rows = []
) => {
	const validRows = [];

	const invalidRows = [];

	rows.forEach((row, rowIndex) => {
		const result =
			validateWindTurbineRow(
				row,
				rowIndex
			);

		if (result.valid) {
			validRows.push(row);
		} else {
			invalidRows.push({
				rowNumber: rowIndex + 1,
				errors: result.errors,
				rawData: row,
			});
		}
	});

	return {
		validRows,
		invalidRows,
	};
};

/**
 * Factory: creates a per-dataset consecutive-identical-value tracker.
 * Must be instantiated once per dataset upload (NOT module-level)
 * so concurrent uploads don't share state.
 *
 * Usage:
 *   const tracker = createConsecutiveTracker(5);
 *   // For each row, call tracker.check(fieldName, rawValue)
 *   // Returns true if the value is the Nth consecutive identical value.
 */
const createConsecutiveTracker = (threshold = 5) => {
	const state = new Map();

	return {
		/**
		 * @param {string} fieldName - column name being tracked
		 * @param {*} rawValue - raw CSV cell value
		 * @returns {boolean} true if this is the `threshold`-th (or more) consecutive identical value
		 */
		check(fieldName, rawValue) {
			if (isBlank(rawValue)) return false;

			const numericValue = Number(rawValue);
			if (!Number.isFinite(numericValue)) return false;

			const entry = state.get(fieldName) || { lastValue: null, count: 0 };

			if (entry.lastValue === numericValue) {
				entry.count += 1;
			} else {
				entry.lastValue = numericValue;
				entry.count = 1;
			}

			state.set(fieldName, entry);
			return entry.count >= threshold;
		},

		/** Reset all tracking state (useful for testing). */
		reset() {
			state.clear();
		},

		/** Read current count for a field (useful for testing). */
		getCount(fieldName) {
			const entry = state.get(fieldName);
			return entry ? entry.count : 0;
		},
	};
};

/**
 * Dataset-level header validation.
 * Call once with the mapped header names from the first parsed row.
 * Returns { valid, errors } — if invalid, abort the entire dataset.
 */
const validateRequiredColumns = (mappedHeaders = []) => {
	const errors = [];

	const hasSpeed = mappedHeaders.some(isWindSpeedField);
	const hasDirection = mappedHeaders.some(isWindDirectionField);
	const hasTimestamp = mappedHeaders.includes('timestamp');

	if (!hasTimestamp) {
		errors.push('Dataset is missing required timestamp column');
	}

	if (!hasSpeed) {
		errors.push('Dataset is missing required wind speed column');
	}

	if (!hasDirection) {
		errors.push('Dataset is missing required wind direction column');
	}

	return {
		valid: errors.length === 0,
		errors,
	};
};

module.exports = {
	isBlank,
	parseTimestamp,
	isValidDate,
	isValidNumber,
	normalizeFieldName,
	isWindSpeedField,
	isWindDirectionField,
	validateRange,
	validateWindTurbineRow,
	validateWindTurbineCsv,
	createConsecutiveTracker,
	validateRequiredColumns,
};