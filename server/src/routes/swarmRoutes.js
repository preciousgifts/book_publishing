const express = require('express');
const { generateOutline, approveOutline, writeChapter, adjustOutline, exportDocx, exportPdf, streamSwarmLogs } = require('../controllers/swarmController');
const authMiddleware = require('../middleware/auth');

const swarmRouter = express.Router();
swarmRouter.use(authMiddleware);
swarmRouter.post('/generate-outline', generateOutline);
swarmRouter.post('/approve-outline', approveOutline);
swarmRouter.post('/write-chapter', writeChapter);
swarmRouter.post('/adjust-outline', adjustOutline);
swarmRouter.get('/logs/:projectId', streamSwarmLogs);

const exportRouter = express.Router();
exportRouter.use(authMiddleware);
exportRouter.get('/:projectId/docx', exportDocx);
exportRouter.get('/:projectId/pdf', exportPdf);

module.exports = {
  swarmRouter,
  exportRouter
};
