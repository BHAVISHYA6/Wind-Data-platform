const mongoose = require('mongoose');

const WindDataSchema = new mongoose.Schema(
	{
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

const WindData = mongoose.model('WindData', WindDataSchema);

module.exports = WindData;
