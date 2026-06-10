const mongoose = require('mongoose');

const WindDataSchema = new mongoose.Schema(
	{
		datasetId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Dataset',
			required: true,
			index: true,
		},
		timestamp: {
			type: Date,
			required: true,
		},
		windSpeeds: {
			type: Map,
			of: Number,
			default: () => new Map(),
		},
		windDirections: {
			type: Map,
			of: Number,
			default: () => new Map(),
		},
		humidity: {
			type: Number,
		},
		temperature: {
			type: Number,
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

WindDataSchema.index({ datasetId: 1, timestamp: 1 });

const WindData = mongoose.model('WindData', WindDataSchema);

module.exports = WindData;
