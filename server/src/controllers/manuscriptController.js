const axios = require('axios');
const prisma = require('../config/db');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * POST /api/projects/upload-manuscript
 */
const uploadManuscript = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'No manuscript file was uploaded.', 400);
    }

    const { title, genre, languageLocale = 'en-US', trimSize = '6x9' } = req.body;
    if (!title || !genre) {
      return sendError(res, 'Title and genre are required fields.', 400);
    }

    console.log(`Forwarding uploaded manuscript "${req.file.originalname}" to Python AI parser...`);

    // Use native Node.js FormData and Blob
    const formData = new FormData();
    const fileBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('file', fileBlob, req.file.originalname);
    formData.append('title', title);
    formData.append('genre', genre);
    formData.append('languageLocale', languageLocale);
    formData.append('trimSize', trimSize);

    const workerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8000';
    const response = await axios.post(`${workerUrl}/internal/manuscript/parse`, formData);

    if (!response.data || !response.data.toc) {
      throw new Error('Invalid response received from manuscript parser worker.');
    }

    const { toc, healthReport, paragraphs } = response.data;

    // Use Prisma transaction to save all project components atomically
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the project
      const project = await tx.project.create({
        data: {
          userId: req.user.id,
          title,
          genre,
          languageLocale,
          trimSize,
          status: 'outline_pending'
        }
      });

      // 2. Create the outline
      const outline = await tx.outline.create({
        data: {
          projectId: project.id,
          tocData: toc,
          approved: false,
          discoveryAnswers: {}
        }
      });

      // 3. Insert parsed paragraphs if available
      if (paragraphs && paragraphs.length > 0) {
        await tx.paragraph.createMany({
          data: paragraphs.map(p => ({
            projectId: project.id,
            chapterIndex: p.chapterIndex,
            paragraphIndex: p.paragraphIndex,
            rawContent: p.rawContent,
            formattedHtml: p.formattedHtml || `<p>${p.rawContent}</p>`,
            statusFlags: p.statusFlags || []
          }))
        });
      }

      // 4. Create UserProgress record
      await tx.userProgress.create({
        data: {
          projectId: project.id,
          activeChapterIndex: 0,
          activeParagraphIndex: 0,
          playbackSpeed: 1.0,
          selectedVoice: ''
        }
      });

      return {
        projectId: project.id,
        outlineId: outline.id,
        tocData: toc,
        healthReport
      };
    });

    return sendSuccess(res, result, 201);
  } catch (error) {
    console.error('Manuscript upload error:', error);
    const errMsg = error.response?.data?.detail || error.message || 'Internal Server Error';
    return sendError(res, `Failed to parse or save manuscript: ${errMsg}`, 500);
  }
};

module.exports = {
  uploadManuscript
};
