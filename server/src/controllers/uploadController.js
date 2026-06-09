const fs = require('fs').promises;
const Papa = require('papaparse');
const WindData = require('../models/WindData');
const ErrorLog = require('../models/ErrorLog');
const Dataset = require('../models/Dataset');
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
	let currentStage = 'initialization';
	const t_start = performance.now();
	let t_parse = 0;
	let t_val = 0;
	let t_db = 0;

	try {
		if (!req.file) {
			return res.status(400).json({
				success: false,
				stage: currentStage,
				message: 'No CSV file uploaded',
			});
		}

		// Explicitly expand request & connection timeout thresholds to 120s
		req.setTimeout(120000);
		res.setTimeout(120000);

		// Create a unique Dataset record
		const newDataset = new Dataset({
			filename: req.file.originalname,
			uploadTimestamp: new Date(),
		});
		await newDataset.save();
		const datasetId = newDataset._id;

		currentStage = 'parsing';
		const t_parse_start = performance.now();
		const csvContent = await fs.readFile(uploadedFilePath, 'utf8');
		const parsedRows = await parseCsv(csvContent);
		const mappedRows = mapWindTurbineCsvRows(parsedRows);
		t_parse = performance.now() - t_parse_start;

		currentStage = 'validation';
		const t_val_start = performance.now();
		const validDocuments = [];
		const invalidDocuments = [];

		// Split validations in batches of 1000, yielding back to unblock the Event Loop
		const batchSize = 1000;
		for (let i = 0; i < mappedRows.length; i += batchSize) {
			const chunk = mappedRows.slice(i, i + batchSize);
			const chunkParsed = parsedRows.slice(i, i + batchSize);

			chunk.forEach((row, index) => {
				const actualIndex = i + index;
				const rawRowData = chunkParsed[index];
				const validationResult = validateWindTurbineRow(row, actualIndex);

				if (validationResult.valid) {
					const doc = buildWindDataDocument(row, rawRowData);
					doc.datasetId = datasetId;
					validDocuments.push(doc);
				} else {
					invalidDocuments.push({
						datasetId,
						rowNumber: actualIndex + 1,
						validationErrors: validationResult.errors,
						rawRowData,
					});
				}
			});

			// Yield back execution
			await new Promise((resolve) => setImmediate(resolve));
		}
		t_val = performance.now() - t_val_start;

		currentStage = 'saving';
		const t_db_start = performance.now();
		
		// Batch insert valid records to avoid memory bloating and DB lockup
		for (let i = 0; i < validDocuments.length; i += batchSize) {
			const batch = validDocuments.slice(i, i + batchSize);
			await WindData.insertMany(batch, { ordered: false });
			await new Promise((resolve) => setImmediate(resolve));
		}

		// Batch insert invalid records
		for (let i = 0; i < invalidDocuments.length; i += batchSize) {
			const batch = invalidDocuments.slice(i, i + batchSize);
			await ErrorLog.insertMany(batch, { ordered: false });
			await new Promise((resolve) => setImmediate(resolve));
		}
		t_db = performance.now() - t_db_start;

		const t_total = performance.now() - t_start;

		// Telemetry console logging
		console.log('--- CSV Processing Benchmarks ---');
		console.log(`Dataset ID: ${datasetId}`);
		console.log(`Parsing Time: ${t_parse.toFixed(2)}ms`);
		console.log(`Validation Time: ${t_val.toFixed(2)}ms`);
		console.log(`Database Insertion Time: ${t_db.toFixed(2)}ms`);
		console.log(`Total Execution Time: ${t_total.toFixed(2)}ms\n`);

		return res.status(200).json({
			success: true,
			datasetId: datasetId,
			datasetName: newDataset.filename,
			uploadTimestamp: newDataset.uploadTimestamp,
			totalRows: mappedRows.length,
			validRows: validDocuments.length,
			invalidRows: invalidDocuments.length,
			processingTime: {
				parsing: parseFloat(t_parse.toFixed(2)),
				validation: parseFloat(t_val.toFixed(2)),
				saving: parseFloat(t_db.toFixed(2)),
				total: parseFloat(t_total.toFixed(2)),
			},
		});
	} catch (error) {
		console.error(`CSV Processing failed during stage: ${currentStage}`, error);
		return res.status(500).json({
			success: false,
			stage: currentStage,
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
