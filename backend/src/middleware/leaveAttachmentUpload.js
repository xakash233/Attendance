import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();

const leaveAttachmentUpload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (_req, file, cb) => {
        const allowedExtensions = ['.pdf', '.jpg', '.jpeg'];
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg'];

        if (allowedExtensions.includes(ext) || allowedMimes.includes(file.mimetype)) {
            cb(null, true);
            return;
        }

        cb(new Error('Invalid file type. Only PDF, JPG, and JPEG files are allowed.'));
    },
});

export default leaveAttachmentUpload;
