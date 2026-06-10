const mongoose = require('mongoose');

const ErrorLogSchema = new mongoose.Schema(
	{
		datasetId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Dataset',
			required: true,
			index: true,
		},
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

ErrorLogSchema.index({ datasetId: 1, createdAt: -1 });

const ErrorLog = mongoose.model('ErrorLog', ErrorLogSchema);

module.exports = ErrorLog;
