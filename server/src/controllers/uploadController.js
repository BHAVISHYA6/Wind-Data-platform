const fs = require('fs').promises;
const Papa = require('papaparse');
const WindData = require('../models/WindData');
const ErrorLog = require('../models/ErrorLog');
const { mapWindTurbineCsvRows } = require('../utils/columnMapper');
const { isBlank, isWindSpeedField, isWindDirectionField, validateWindTurbineRow } = require('../utils/validator');

const parseCsv = (csvContent) =>
	new Promise((resolve, reject) => {
		Papa.parse(csvContent, {
			header: true,
			skipEmptyLines: true,
			complete: (result) => {
				if (result.errors && result.errors.length > 0) {
					return reject(new Error(result.errors[0].message || 'CSV parsing failed'));
				}

				return resolve(result.data || []);
			},
			error: (error) => reject(error),
		});
	});

const toNumber = (value) => {
	if (isBlank(value)) {
		return undefined;
	}

	const numberValue = Number(value);
	return Number.isFinite(numberValue) ? numberValue : undefined;
};

const buildWindDataDocument = (row, rawRowData) => {
	const windSpeeds = new Map();
	const windDirections = new Map();
	let humidity;
	let temperature;

	Object.entries(row).forEach(([fieldName, value]) => {
		if (fieldName === 'timestamp' || fieldName === 'rawRowData') {
			return;
		}

		if (fieldName === 'humidity') {
			humidity = toNumber(value);
			return;
		}

		if (fieldName === 'temperature') {
			temperature = toNumber(value);
			return;
		}

		if (isWindSpeedField(fieldName)) {
			const numericValue = toNumber(value);
			if (numericValue !== undefined) {
				windSpeeds.set(fieldName, numericValue);
			}
			return;
		}

		if (isWindDirectionField(fieldName)) {
			const numericValue = toNumber(value);
			if (numericValue !== undefined) {
				windDirections.set(fieldName, numericValue);
			}
		}
	});

	return {
		timestamp: new Date(row.timestamp),
		windSpeeds,
		windDirections,
		humidity,
		temperature,
		rawRowData,
	};
};

const uploadCsv = async (req, res) => {
	const uploadedFilePath = req.file && req.file.path;

	try {
		if (!req.file) {
			return res.status(400).json({
				success: false,
				message: 'No CSV file uploaded',
			});
		}

		const csvContent = await fs.readFile(uploadedFilePath, 'utf8');
		const parsedRows = await parseCsv(csvContent);
		const mappedRows = mapWindTurbineCsvRows(parsedRows);

		const validDocuments = [];
		const invalidDocuments = [];

		mappedRows.forEach((row, index) => {
			const rawRowData = parsedRows[index];
			const validationResult = validateWindTurbineRow(row, index);

			if (validationResult.valid) {
				validDocuments.push(buildWindDataDocument(row, rawRowData));
				return;
			}

			invalidDocuments.push({
				rowNumber: index + 1,
				validationErrors: validationResult.errors,
				rawRowData,
			});
		});

		const insertTasks = [];

		if (validDocuments.length > 0) {
			insertTasks.push(WindData.insertMany(validDocuments, { ordered: false }));
		}

		if (invalidDocuments.length > 0) {
			insertTasks.push(ErrorLog.insertMany(invalidDocuments, { ordered: false }));
		}

		if (insertTasks.length > 0) {
			await Promise.all(insertTasks);
		}

		return res.status(200).json({
			success: true,
			totalRows: mappedRows.length,
			validRows: validDocuments.length,
			invalidRows: invalidDocuments.length,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to process CSV upload',
		});
	} finally {
		if (uploadedFilePath) {
			await fs.unlink(uploadedFilePath).catch(() => {});
		}
	}
};

module.exports = {
	uploadCsv,
};
