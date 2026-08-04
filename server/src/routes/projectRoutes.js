const express = require('express');
const { getProjects, createProject, getProjectById, deleteProject } = require('../controllers/projectController');
const { uploadManuscript } = require('../controllers/manuscriptController');
const authMiddleware = require('../middleware/auth');
const upload = require('../config/multerConfig');

const router = express.Router();

// Enforce auth on all project routes
router.use(authMiddleware);

router.get('/', getProjects);
router.post('/', createProject);
router.get('/:id', getProjectById);
router.delete('/:id', deleteProject);
router.post('/upload-manuscript', upload.single('file'), uploadManuscript);

module.exports = router;
