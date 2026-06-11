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

	// Wind speed validation
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

		if (!validateRange(value, 0, 60)) {
			errors.push(
				buildRangeError(
					rowIndex,
					fieldName,
					0,
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
};