const WindData = require('../models/WindData');
const ErrorLog = require('../models/ErrorLog');

/**
 * GET /api/analytics/summary
 * Returns aggregate statistics about wind data and error logs
 */
const getSummary = async (req, res) => {
	try {
		// Use aggregation pipeline to get statistics
		const windDataStats = await WindData.aggregate([
			{
				$group: {
					_id: null,
					totalRecords: { $sum: 1 },
					avgHumidity: { $avg: '$humidity' },
					avgTemperature: { $avg: '$temperature' },
				},
			},
		]);

		const errorLogsCount = await ErrorLog.countDocuments();

		// Extract values or provide defaults if no data exists
		const stats = windDataStats.length > 0 ? windDataStats[0] : {
			totalRecords: 0,
			avgHumidity: null,
			avgTemperature: null,
		};

		res.status(200).json({
			success: true,
			data: {
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
 * Returns latest 100 wind data records sorted by timestamp
 */
const getTimeseries = async (req, res) => {
	try {
		const records = await WindData.find()
			.select('timestamp humidity temperature')
			.sort({ timestamp: -1 })
			.limit(100)
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
 * GET /api/errorlogs
 * Returns latest 100 error logs
 */
const getErrorLogs = async (req, res) => {
	try {
		const errorLogs = await ErrorLog.find()
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

module.exports = {
	getSummary,
	getTimeseries,
	getErrorLogs,
};
