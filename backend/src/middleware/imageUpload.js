import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();

const imageUpload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

        if (allowedExtensions.includes(ext) || allowedMimes.includes(file.mimetype)) {
            cb(null, true);
            return;
        }

        cb(new Error('Invalid file type. Only JPG, PNG, WEBP, and GIF images are allowed.'));
    },
});

export default imageUpload;
