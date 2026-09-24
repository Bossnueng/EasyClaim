const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.resolve(
    __dirname,
    '../uploads/claims'
);

// สร้าง folder อัตโนมัติ ถ้ายังไม่มี
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {
        recursive: true
    });
}

console.log('Upload directory:', uploadDir);

const storage = multer.diskStorage({

    // =========================
    // กำหนด Folder ที่เก็บไฟล์
    // =========================
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },

    // =========================
    // กำหนดชื่อไฟล์
    // =========================
    filename: function (req, file, cb) {

        const ext = path.extname(file.originalname);

        const filename =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1E9) +
            ext;

        cb(null, filename);
    }
});

const upload = multer({
    storage: storage
});

module.exports = upload;