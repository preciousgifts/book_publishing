const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const { getStyleGuide, upsertStyleGuide } = require('../controllers/styleGuideController');

router.use(authenticateToken);

router.get('/:projectId', getStyleGuide);
router.post('/', upsertStyleGuide);

module.exports = router;
