const express = require('express');
const router = express.Router({ mergeParams: true });
const authMiddleware = require('../middleware/auth');
const {
  getMatterPages,
  updateMatterPage,
  batchUpdateMatterPages,
  generateMatterPage,
  generateAllMatterPages,
  approveMatterPage
} = require('../controllers/matterController');

router.use(authMiddleware);

router.get('/', getMatterPages);
router.patch('/:id', updateMatterPage);
router.post('/batch-toggle', batchUpdateMatterPages);
router.post('/:id/generate', generateMatterPage);
router.post('/generate-all', generateAllMatterPages);
router.post('/:id/approve', approveMatterPage);

module.exports = router;
