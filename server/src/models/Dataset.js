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
	},
	{
		timestamps: true,
	}
);

const Dataset = mongoose.model('Dataset', DatasetSchema);

module.exports = Dataset;
