
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.resolve(
    __dirname,
    '../uploads/claimsreturn'
);

// สร้างโฟลเดอร์อัตโนมัติถ้ายังไม่มี
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `claimreturn_${Date.now()}_${Math.round(
            Math.random() * 1e9
        )}${ext}`;

        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("รองรับเฉพาะไฟล์ JPG, PNG และ WEBP"));
    }
};

module.exports = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // จำกัด 5 MB
    }
});
