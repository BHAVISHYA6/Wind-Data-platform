const express = require('express');
const router = express.Router();
const {
	getSummary,
	getTimeseries,
	getErrorLogs,
} = require('../controllers/analyticsController');

/**
 * @route   GET /api/analytics/summary
 * @desc    Get summary statistics (total records, average humidity/temperature)
 * @access  Public
 */
router.get('/summary', getSummary);

/**
 * @route   GET /api/analytics/timeseries
 * @desc    Get latest 100 wind data records with timestamp, humidity, temperature
 * @access  Public
 */
router.get('/timeseries', getTimeseries);

/**
 * @route   GET /api/errorlogs
 * @desc    Get latest 100 error logs
 * @access  Public
 */
router.get('/errorlogs', getErrorLogs);

module.exports = router;
