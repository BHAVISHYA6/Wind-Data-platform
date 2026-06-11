const fs = require('fs');
const fsPromises = fs.promises;
const mongoose = require('mongoose');
const Papa = require('papaparse');
const WindData = require('../models/WindData');
const ErrorLog = require('../models/ErrorLog');
const Dataset = require('../models/Dataset');
const { mapWindTurbineCsvRows, mapHeader } = require('../utils/columnMapper');
const { isBlank, parseTimestamp, isWindSpeedField, isWindDirectionField, validateWindTurbineRow } = require('../utils/validator');

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
		timestamp: parseTimestamp(row.timestamp),
		windSpeeds,
		windDirections,
		humidity,
		temperature,
		rawRowData,
	};
};

const countLines = (filePath) => {
	return new Promise((resolve, reject) => {
		let count = 0;
		const stream = fs.createReadStream(filePath);
		stream.on('data', (chunk) => {
			for (let i = 0; i < chunk.length; ++i) {
				if (chunk[i] === 10) { // 10 is '\n'
					count++;
				}
			}
		});
		stream.on('end', () => {
			resolve(count);
		});
		stream.on('error', (err) => {
			reject(err);
		});
	});
};

const processDatasetInBackground = async (datasetId, filePath) => {
	const t_start = performance.now();
	let totalValidationTime = 0;
	let totalSavingTime = 0;

	let totalRows = 0;
	let processedRows = 0;
	let validRows = 0;
	let invalidRows = 0;

	const handleFailure = async (err) => {
		console.error('Error during background CSV processing:', err);
		try {
			await Dataset.findByIdAndUpdate(datasetId, {
				status: 'failed',
				stage: 'failed',
				errorDetails: err.message || 'Unknown processing error',
			});
		} catch (dbErr) {
			console.error('Failed to update dataset failure status in DB:', dbErr);
		} finally {
			await fsPromises.unlink(filePath).catch(() => {});
		}
	};

	const processBatch = async (batch, startIndex) => {
		const t_val_start = performance.now();
		const validDocuments = [];
		const invalidDocuments = [];

		const mapRowHeaders = (row) => {
			return Object.entries(row).reduce((mappedRow, [key, value]) => {
				const mappedKey = mapHeader(key);
				mappedRow[mappedKey] = value;
				return mappedRow;
			}, {});
		};

		batch.forEach(({ rawRow }, index) => {
			const actualIndex = startIndex + index;
			const mappedRow = mapRowHeaders(rawRow);
			const validationResult = validateWindTurbineRow(mappedRow, actualIndex);

			if (validationResult.valid) {
				const doc = buildWindDataDocument(mappedRow, rawRow);
				doc.datasetId = datasetId;
				validDocuments.push(doc);
			} else {
				invalidDocuments.push({
					datasetId,
					rowNumber: actualIndex + 1,
					validationErrors: validationResult.errors,
					rawRowData: rawRow,
				});
			}
		});

		const valTime = performance.now() - t_val_start;

		const t_db_start = performance.now();
		if (validDocuments.length > 0) {
			await WindData.insertMany(validDocuments, { ordered: false });
		}
		if (invalidDocuments.length > 0) {
			await ErrorLog.insertMany(invalidDocuments, { ordered: false });
		}
		const dbTime = performance.now() - t_db_start;

		return {
			validCount: validDocuments.length,
			invalidCount: invalidDocuments.length,
			valTime,
			dbTime,
		};
	};

	try {
		// 1. Initial count lines for totalRows calculation
		const totalLines = await countLines(filePath);
		totalRows = Math.max(0, totalLines - 1);

		await Dataset.findByIdAndUpdate(datasetId, {
			totalRows,
			stage: 'processing',
			progress: 0,
		});

		const readStream = fs.createReadStream(filePath);
		const BATCH_SIZE = 2000;
		let rowBuffer = [];

		Papa.parse(readStream, {
			header: true,
			skipEmptyLines: true,
			step: (results, parser) => {
				rowBuffer.push({ rawRow: results.data });

				if (rowBuffer.length >= BATCH_SIZE) {
					parser.pause();
					const currentBatch = rowBuffer;
					rowBuffer = [];

					Dataset.findByIdAndUpdate(datasetId, { stage: 'validating' })
						.then(() => processBatch(currentBatch, processedRows))
						.then(async (result) => {
							processedRows += currentBatch.length;
							validRows += result.validCount;
							invalidRows += result.invalidCount;
							totalValidationTime += result.valTime;
							totalSavingTime += result.dbTime;

							const progress = totalRows > 0 ? Math.min(99, Math.round((processedRows / totalRows) * 100)) : 0;

							await Dataset.findByIdAndUpdate(datasetId, {
								processedRows,
								validRows,
								invalidRows,
								progress,
								stage: 'processing',
							});

							parser.resume();
						})
						.catch(async (err) => {
							parser.abort();
							await handleFailure(err);
						});
				}
			},
			complete: async () => {
				try {
					if (rowBuffer.length > 0) {
						const currentBatch = rowBuffer;
						rowBuffer = [];

						await Dataset.findByIdAndUpdate(datasetId, { stage: 'validating' });
						const result = await processBatch(currentBatch, processedRows);

						processedRows += currentBatch.length;
						validRows += result.validCount;
						invalidRows += result.invalidCount;
						totalValidationTime += result.valTime;
						totalSavingTime += result.dbTime;
					}

					const t_total = performance.now() - t_start;
					const t_parse = Math.max(0, t_total - totalValidationTime - totalSavingTime);

					await Dataset.findByIdAndUpdate(datasetId, {
						status: 'completed',
						stage: 'completed',
						progress: 100,
						totalRows: processedRows, // finalize with the actual rows processed
						processedRows,
						validRows,
						invalidRows,
						processingTime: {
							parsing: parseFloat(t_parse.toFixed(2)),
							validation: parseFloat(totalValidationTime.toFixed(2)),
							saving: parseFloat(totalSavingTime.toFixed(2)),
							total: parseFloat(t_total.toFixed(2)),
						},
					});

					// Telemetry console logging
					console.log('--- CSV Processing Benchmarks ---');
					console.log(`Dataset ID: ${datasetId}`);
					console.log(`Parsing Time: ${t_parse.toFixed(2)}ms`);
					console.log(`Validation Time: ${totalValidationTime.toFixed(2)}ms`);
					console.log(`Database Insertion Time: ${totalSavingTime.toFixed(2)}ms`);
					console.log(`Total Execution Time: ${t_total.toFixed(2)}ms\n`);

				} catch (err) {
					await handleFailure(err);
				} finally {
					await fsPromises.unlink(filePath).catch(() => {});
				}
			},
			error: async (err) => {
				await handleFailure(err);
			},
		});

	} catch (error) {
		await handleFailure(error);
	}
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

		// Create a unique Dataset record immediately in processing state
		const newDataset = new Dataset({
			filename: req.file.originalname,
			uploadTimestamp: new Date(),
			status: 'processing',
			stage: 'initialization',
			progress: 0,
		});
		await newDataset.save();
		const datasetId = newDataset._id;

		// Kick off background processing asynchronously
		processDatasetInBackground(datasetId, uploadedFilePath);

		// Immediately return acknowledgement to the client
		return res.status(200).json({
			success: true,
			datasetId: datasetId.toString(),
			status: 'processing',
		});
	} catch (error) {
		console.error(`Failed to initiate CSV upload:`, error);
		if (uploadedFilePath) {
			await fsPromises.unlink(uploadedFilePath).catch(() => {});
		}
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to process CSV upload',
		});
	}
};

const getUploadStatus = async (req, res) => {
	try {
		const { datasetId } = req.params;
		if (!mongoose.Types.ObjectId.isValid(datasetId)) {
			return res.status(400).json({
				success: false,
				message: 'Invalid dataset ID',
			});
		}

		const dataset = await Dataset.findById(datasetId);
		if (!dataset) {
			return res.status(404).json({
				success: false,
				message: 'Dataset not found',
			});
		}

		return res.status(200).json({
			status: dataset.status,
			stage: dataset.stage,
			progress: dataset.progress,
			totalRows: dataset.totalRows,
			processedRows: dataset.processedRows,
			validRows: dataset.validRows,
			invalidRows: dataset.invalidRows,
			errorDetails: dataset.errorDetails,
			processingTime: dataset.processingTime,
		});
	} catch (error) {
		console.error('Error fetching dataset status:', error);
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to fetch dataset status',
		});
	}
};

module.exports = {
	uploadCsv,
	getUploadStatus,
};

