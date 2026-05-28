const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { uploadCsv } = require('../controllers/uploadController');

const router = express.Router();

const uploadDir = path.join(process.cwd(), 'upload');

if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, uploadDir);
	},
	filename: (req, file, cb) => {
		cb(null, `${Date.now()}-${file.originalname}`);
	},
});

const fileFilter = (req, file, cb) => {
	const isCsv = file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv';

	if (isCsv) {
		return cb(null, true);
	}

	return cb(new Error('Only CSV files are allowed'));
};

const upload = multer({
	storage,
	fileFilter,
});

router.post('/upload', upload.single('file'), uploadCsv);

module.exports = router;
