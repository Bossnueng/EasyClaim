// [DOC-FIX 2026-10-31] อัปโหลดไฟล์ลายเซ็นผู้สอบทาน → src/uploads/signatures (PNG/JPG ไม่เกิน 2MB)
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.resolve(__dirname, "../uploads/signatures");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_TYPES = ["image/png", "image/jpeg"];
const MAX_SIZE = 2 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || "").toLowerCase() || (file.mimetype === "image/png" ? ".png" : ".jpg");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const uploadSignature = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
    const err = new Error("รองรับเฉพาะไฟล์ PNG หรือ JPG");
    err.code = "INVALID_FILE_TYPE";
    return cb(err);
  },
});

// ห่อ multer เพื่อตอบ 400 พร้อมข้อความภาษาไทยแทน error 500
const singleSignatureFile = (req, res, next) => {
  uploadSignature.single("file")(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "ไฟล์ต้องไม่เกิน 2 MB" : err.message || "อัปโหลดไฟล์ไม่สำเร็จ";
    return res.status(400).json({ status: false, message });
  });
};

module.exports = { singleSignatureFile, uploadDir };
