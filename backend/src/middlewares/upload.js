const multer = require('multer');
const path = require('path');

// Configure multer storage
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.csv', '.json', '.xml'];
        const ext = path.extname(file.originalname).toLowerCase();

        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only CSV, JSON, and XML are allowed.'));
        }
    }
});

module.exports = upload;
