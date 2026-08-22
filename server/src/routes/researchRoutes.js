const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const {
  generateResearch,
  getResearchReport,
  getAllResearchReports,
  injectResearchIntoOutline,
  deleteResearchReport
} = require('../controllers/researchController');

router.use(authenticateToken);

router.get('/', getAllResearchReports);
router.post('/generate', generateResearch);
router.get('/:projectId', getResearchReport);
router.post('/use-in-outline', injectResearchIntoOutline);
router.delete('/:projectId', deleteResearchReport);

module.exports = router;
