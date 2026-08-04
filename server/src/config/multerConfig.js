const multer = require('multer');
const path = require('path');

// Store files in memory buffer
const storage = multer.memoryStorage();

// Accept only text, markdown and docx files
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.docx', '.txt', '.md'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only ${allowedExtensions.join(', ')} files are allowed.`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

module.exports = upload;
