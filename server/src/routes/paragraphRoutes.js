const express = require('express');
const { updateParagraph, updateProgress } = require('../controllers/paragraphController');
const authMiddleware = require('../middleware/auth');

const paragraphRouter = express.Router();
paragraphRouter.use(authMiddleware);
paragraphRouter.put('/:id', updateParagraph);

const progressRouter = express.Router();
progressRouter.use(authMiddleware);
progressRouter.post('/', updateProgress);

module.exports = {
  paragraphRouter,
  progressRouter
};
