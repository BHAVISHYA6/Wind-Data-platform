const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

const isValidDate = (value) => {
	if (isBlank(value)) {
		return false;
	}

	const parsedDate = new Date(value);
	return !Number.isNaN(parsedDate.getTime());
};

const isValidNumber = (value) => {
	if (isBlank(value)) {
		return false;
	}

	const numberValue = Number(value);
	return Number.isFinite(numberValue);
};

const normalizeFieldName = (fieldName) =>
	String(fieldName)
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');

const isWindSpeedField = (fieldName) => {
	const normalizedFieldName = normalizeFieldName(fieldName);
	return normalizedFieldName.includes('windspeed') || normalizedFieldName.includes('speed');
};

const isWindDirectionField = (fieldName) => {
	const normalizedFieldName = normalizeFieldName(fieldName);
	return (
		normalizedFieldName.includes('winddirection') ||
		normalizedFieldName.includes('direction') ||
		normalizedFieldName.includes('winddir') ||
		normalizedFieldName.endsWith('dir')
	);
};

const validateRange = (value, min, max) => {
	if (!isValidNumber(value)) {
		return false;
	}

	const numericValue = Number(value);
	return numericValue >= min && numericValue <= max;
};

const buildMissingValueError = (rowIndex, fieldName) =>
	`Row ${rowIndex + 1}: ${fieldName} is missing`;

const buildRangeError = (rowIndex, fieldName, min, max, value, label) =>
	`Row ${rowIndex + 1}: ${label} ${fieldName} must be between ${min} and ${max} (${value})`;

const validateWindTurbineRow = (row = {}, rowIndex = 0) => {
	const errors = [];
	const fieldNames = Object.keys(row);
	const timestampValue = row.timestamp;

	if (isBlank(timestampValue)) {
		errors.push(buildMissingValueError(rowIndex, 'timestamp'));
	} else if (!isValidDate(timestampValue)) {
		errors.push(`Row ${rowIndex + 1}: timestamp must be a valid date`);
	}

	const speedFields = fieldNames.filter(isWindSpeedField);
	const directionFields = fieldNames.filter(isWindDirectionField);

	if (speedFields.length === 0) {
		errors.push(`Row ${rowIndex + 1}: at least one wind speed field is required`);
	}

	if (directionFields.length === 0) {
		errors.push(`Row ${rowIndex + 1}: at least one wind direction field is required`);
	}

	speedFields.forEach((fieldName) => {
		const value = row[fieldName];
		if (isBlank(value)) {
			errors.push(buildMissingValueError(rowIndex, fieldName));
			return;
		}

		if (!validateRange(value, 2, 60)) {
			errors.push(buildRangeError(rowIndex, fieldName, 2, 60, value, 'wind speed'));
		}
	});

	directionFields.forEach((fieldName) => {
		const value = row[fieldName];
		if (isBlank(value)) {
			errors.push(buildMissingValueError(rowIndex, fieldName));
			return;
		}

		if (!validateRange(value, 0, 360)) {
			errors.push(buildRangeError(rowIndex, fieldName, 0, 360, value, 'wind direction'));
		}
	});

	return {
		valid: errors.length === 0,
		errors,
	};
};

const validateWindTurbineCsv = (rows = []) => {
	const errors = [];

	rows.forEach((row, rowIndex) => {
		const rowResult = validateWindTurbineRow(row, rowIndex);
		errors.push(...rowResult.errors);
	});

	return {
		valid: errors.length === 0,
		errors,
	};
};

module.exports = {
	isBlank,
	isValidDate,
	isValidNumber,
	normalizeFieldName,
	isWindSpeedField,
	isWindDirectionField,
	validateRange,
	validateWindTurbineRow,
	validateWindTurbineCsv,
};
