const mongoose = require('mongoose');
const WindData = require('../models/WindData');
const ErrorLog = require('../models/ErrorLog');
const Dataset = require('../models/Dataset');

// Helper to determine the target datasetId (either query param or fallback to latest)
const getTargetDatasetId = async (queryDatasetId) => {
	if (queryDatasetId && mongoose.Types.ObjectId.isValid(queryDatasetId)) {
		return queryDatasetId;
	}
	// Fallback to the latest uploaded dataset
	const latestDataset = await Dataset.findOne().sort({ uploadTimestamp: -1 }).select('_id');
	return latestDataset ? latestDataset._id : null;
};

/**
 * GET /api/analytics/summary
 * Returns aggregate statistics about wind data and error logs for the target dataset
 */
const getSummary = async (req, res) => {
	try {
		const datasetId = await getTargetDatasetId(req.query.datasetId);
		if (!datasetId) {
			return res.status(200).json({
				success: true,
				data: {
					datasetId: null,
					datasetName: 'No active dataset',
					uploadTimestamp: null,
					totalWindDataRecords: 0,
					totalErrorLogRecords: 0,
					averageHumidity: null,
					averageTemperature: null,
				},
			});
		}

		// Retrieve dataset details
		const dataset = await Dataset.findById(datasetId);

		// Group statistics only for matching datasetId
		const windDataStats = await WindData.aggregate([
			{
				$match: {
					datasetId: new mongoose.Types.ObjectId(datasetId),
				},
			},
			{
				$group: {
					_id: null,
					totalRecords: { $sum: 1 },
					avgHumidity: { $avg: '$humidity' },
					avgTemperature: { $avg: '$temperature' },
				},
			},
		]);

		const errorLogsCount = await ErrorLog.countDocuments({ datasetId });

		const stats = windDataStats.length > 0 ? windDataStats[0] : {
			totalRecords: 0,
			avgHumidity: null,
			avgTemperature: null,
		};

		res.status(200).json({
			success: true,
			data: {
				datasetId,
				datasetName: dataset ? dataset.filename : 'Unknown',
				uploadTimestamp: dataset ? dataset.uploadTimestamp : null,
				totalWindDataRecords: stats.totalRecords,
				totalErrorLogRecords: errorLogsCount,
				averageHumidity: stats.avgHumidity ? parseFloat(stats.avgHumidity.toFixed(2)) : null,
				averageTemperature: stats.avgTemperature ? parseFloat(stats.avgTemperature.toFixed(2)) : null,
			},
		});
	} catch (error) {
		console.error('Error fetching summary:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch summary statistics',
			message: error.message,
		});
	}
};

/**
 * GET /api/analytics/timeseries
 * Returns latest wind data records for the target dataset sorted by timestamp
 */
const getTimeseries = async (req, res) => {
	try {
		const datasetId = await getTargetDatasetId(req.query.datasetId);
		if (!datasetId) {
			return res.status(200).json({
				success: true,
				count: 0,
				data: [],
			});
		}

		const MAX_LIMIT = 10000;
		const requested = req.query.limit ? parseInt(req.query.limit, 10) : MAX_LIMIT;
		const limit = Number.isFinite(requested) && requested > 0
			? Math.min(requested, MAX_LIMIT)
			: MAX_LIMIT;

		const records = await WindData.find({ datasetId })
			.sort({ timestamp: 1 })
			.limit(limit)
			.lean();

		res.status(200).json({
			success: true,
			count: records.length,
			data: records,
		});
	} catch (error) {
		console.error('Error fetching timeseries data:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch timeseries data',
			message: error.message,
		});
	}
};

/**
 * GET /api/analytics/errorlogs
 * Returns latest 100 error logs for the target dataset
 */
const getErrorLogs = async (req, res) => {
	try {
		const datasetId = await getTargetDatasetId(req.query.datasetId);
		if (!datasetId) {
			return res.status(200).json({
				success: true,
				count: 0,
				data: [],
			});
		}

		const errorLogs = await ErrorLog.find({ datasetId })
			.sort({ createdAt: -1 })
			.limit(100)
			.lean();

		res.status(200).json({
			success: true,
			count: errorLogs.length,
			data: errorLogs,
		});
	} catch (error) {
		console.error('Error fetching error logs:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch error logs',
			message: error.message,
		});
	}
};

/**
 * GET /api/analytics/datasets
 * Returns list of all uploaded datasets
 */
const getDatasets = async (req, res) => {
	try {
		const datasets = await Dataset.find().sort({ uploadTimestamp: -1 }).lean();
		res.status(200).json({
			success: true,
			data: datasets,
		});
	} catch (error) {
		console.error('Error fetching datasets list:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch datasets list',
			message: error.message,
		});
	}
};

module.exports = {
	getSummary,
	getTimeseries,
	getErrorLogs,
	getDatasets,
};
