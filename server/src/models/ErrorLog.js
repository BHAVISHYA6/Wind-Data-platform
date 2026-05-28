const mongoose = require('mongoose');

const ErrorLogSchema = new mongoose.Schema(
	{
		rowNumber: {
			type: Number,
			required: true,
		},
		validationErrors: {
			type: [String],
			default: [],
		},
		rawRowData: {
			type: mongoose.Schema.Types.Mixed,
			default: {},
		},
	},
	{
		timestamps: true,
		minimize: false,
	}
);

const ErrorLog = mongoose.model('ErrorLog', ErrorLogSchema);

module.exports = ErrorLog;
