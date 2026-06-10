const mongoose = require('mongoose');

const DatasetSchema = new mongoose.Schema(
	{
		filename: {
			type: String,
			required: true,
		},
		uploadTimestamp: {
			type: Date,
			default: Date.now,
		},
		status: {
			type: String,
			enum: ['processing', 'completed', 'failed'],
			default: 'processing',
		},
		stage: {
			type: String,
			enum: ['initialization', 'processing', 'validating', 'saving', 'completed', 'failed'],
			default: 'initialization',
		},
		progress: {
			type: Number,
			default: 0,
		},
		totalRows: {
			type: Number,
			default: 0,
		},
		processedRows: {
			type: Number,
			default: 0,
		},
		validRows: {
			type: Number,
			default: 0,
		},
		invalidRows: {
			type: Number,
			default: 0,
		},
		errorDetails: {
			type: String,
		},
		processingTime: {
			parsing: { type: Number, default: 0 },
			validation: { type: Number, default: 0 },
			saving: { type: Number, default: 0 },
			total: { type: Number, default: 0 },
		},
	},
	{
		timestamps: true,
	}
);

DatasetSchema.index({ uploadTimestamp: -1 });

const Dataset = mongoose.model('Dataset', DatasetSchema);

module.exports = Dataset;

