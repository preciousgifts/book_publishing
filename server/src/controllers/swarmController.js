const { z } = require('zod');
const prisma = require('../config/db');
const pythonWorkerClient = require('../utils/pythonWorkerClient');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const generateOutlineSchema = z.object({
  projectId: z.string().uuid({ message: 'Invalid project ID' }),
  prompt: z.string().min(1, { message: 'Prompt is required' }),
  genre: z.enum(['fiction', 'non-fiction'], { message: 'Genre must be fiction or non-fiction' }),
  tone: z.string().optional()
});

const approveOutlineSchema = z.object({
  outlineId: z.string().uuid({ message: 'Invalid outline ID' }),
  discoveryAnswers: z.record(z.any()).default({})
});

const writeChapterSchema = z.object({
  projectId: z.string().uuid({ message: 'Invalid project ID' }),
  chapterIndex: z.number().int().min(0, { message: 'Chapter index must be a non-negative integer' })
});

const adjustOutlineSchema = z.object({
  projectId: z.string().uuid({ message: 'Invalid project ID' }),
  action: z.enum(['expand', 'condense', 'custom'], { message: 'Action must be expand, condense, or custom' }),
  targetChapterCount: z.number().int().optional().nullable(),
  feedback: z.string().optional().nullable()
});

/**
 * POST /api/swarm/generate-outline
 */
const generateOutline = async (req, res) => {
  try {
    const parseResult = generateOutlineSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map(err => err.message).join(', ');
      return sendError(res, errorMsg, 400);
    }

    const { projectId, prompt, genre, tone } = parseResult.data;

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.id }
    });

    if (!project) {
      return sendError(res, 'Project not found or access denied', 404);
    }

    // Call Python worker with project details for outline generation context
    const response = await pythonWorkerClient.post('/internal/swarm/outline', {
      projectId,
      prompt,
      genre,
      tone,
      title: project.title,
      languageLocale: project.languageLocale
    });

    const tocData = response.data.toc_data || response.data.tocData || response.data.toc || response.data;
    const discoveryQuestions = response.data.discovery_questions || response.data.discoveryQuestions || [];

    // Create a new outline containing both outline ToC and discovery questions
    const outline = await prisma.outline.create({
      data: {
        projectId,
        tocData: {
          toc: tocData,
          discoveryQuestions: discoveryQuestions
        },
        approved: false
      }
    });

    return sendSuccess(res, outline, 201);
  } catch (error) {
    console.error('Generate outline error:', error);
    const statusCode = error.statusCode || 500;
    return sendError(res, error.message || 'Failed to generate outline', statusCode);
  }
};

/**
 * POST /api/swarm/approve-outline
 */
const approveOutline = async (req, res) => {
  try {
    const parseResult = approveOutlineSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map(err => err.message).join(', ');
      return sendError(res, errorMsg, 400);
    }

    const { outlineId, discoveryAnswers } = parseResult.data;

    // Verify project ownership via outline link
    const outline = await prisma.outline.findFirst({
      where: {
        id: outlineId,
        project: {
          userId: req.user.id
        }
      }
    });

    if (!outline) {
      return sendError(res, 'Outline not found or access denied', 404);
    }

    // Update outline and project status in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedOutline = await tx.outline.update({
        where: { id: outlineId },
        data: {
          approved: true,
          discoveryAnswers
        }
      });

      await tx.project.update({
        where: { id: outline.projectId },
        data: {
          status: 'in_progress'
        }
      });

      return updatedOutline;
    });

    return sendSuccess(res, result);
  } catch (error) {
    console.error('Approve outline error:', error);
    return sendError(res, 'Internal server error while approving outline', 500);
  }
};

/**
 * POST /api/swarm/write-chapter
 */
const writeChapter = async (req, res) => {
  try {
    const parseResult = writeChapterSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map(err => err.message).join(', ');
      return sendError(res, errorMsg, 400);
    }

    const { projectId, chapterIndex } = parseResult.data;

    // 1. Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.id }
    });

    if (!project) {
      return sendError(res, 'Project not found or access denied', 404);
    }

    // 2. Fetch approved outline to retrieve chapter summary
    const outline = await prisma.outline.findFirst({
      where: {
        projectId,
        approved: true
      }
    });

    if (!outline) {
      return sendError(res, 'No approved outline found. Please generate and approve outline first.', 400);
    }

    // Parse toc details
    let summary = '';
    const tocDataObj = outline.tocData || {};
    const tocList = tocDataObj.toc || (Array.isArray(tocDataObj) ? tocDataObj : []);
    
    // Find chapter outline summary by index match (1-indexed matching)
    const chapterOutline = tocList.find(ch => 
      ch.chapterNumber === (chapterIndex + 1) || 
      ch.chapterIndex === chapterIndex
    );
    
    if (chapterOutline) {
      summary = chapterOutline.summary || '';
    } else {
      summary = `Write details for Chapter ${chapterIndex + 1}`;
    }

    const discoveryAnswers = outline.discoveryAnswers || {};

    // 3. Call Python worker sending complete parameters payload
    const response = await pythonWorkerClient.post('/internal/swarm/write-chapter', {
      projectId,
      chapterIndex,
      summary,
      discoveryAnswers,
      languageLocale: project.languageLocale,
      genre: project.genre
    });

    // Parse prose output
    let parsedParagraphs = [];
    const data = response.data;

    if (data && Array.isArray(data.paragraphs)) {
      parsedParagraphs = data.paragraphs.map(p => {
        if (typeof p === 'object' && p !== null) {
          return {
            rawContent: p.rawContent || p.text || '',
            formattedHtml: p.formattedHtml || p.html || `<p>${p.rawContent || p.text || ''}</p>`
          };
        } else if (typeof p === 'string') {
          return {
            rawContent: p,
            formattedHtml: `<p>${p}</p>`
          };
        }
        return null;
      }).filter(Boolean);
    } else if (data && typeof data.prose === 'string') {
      parsedParagraphs = data.prose
        .split('\n\n')
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map(p => ({
          rawContent: p,
          formattedHtml: `<p>${p}</p>`
        }));
    } else if (typeof data === 'string') {
      parsedParagraphs = data
        .split('\n\n')
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map(p => ({
          rawContent: p,
          formattedHtml: `<p>${p}</p>`
        }));
    } else {
      return sendError(res, 'Unexpected response format from Python AI worker', 502);
    }

    const statusFlags = data.status_flags || data.statusFlags || [];

    // Persist paragraphs in transaction (overwrite existing paragraphs for the same chapterIndex)
    const savedParagraphs = await prisma.$transaction(async (tx) => {
      // Clear out older generation if exists
      await tx.paragraph.deleteMany({
        where: {
          projectId,
          chapterIndex
        }
      });

      // Insert new ones
      const created = [];
      for (let i = 0; i < parsedParagraphs.length; i++) {
        const item = parsedParagraphs[i];
        const record = await tx.paragraph.create({
          data: {
            projectId,
            chapterIndex,
            paragraphIndex: i,
            rawContent: item.rawContent,
            formattedHtml: item.formattedHtml,
            statusFlags: statusFlags
          }
        });
        created.push(record);
      }
      return created;
    });

    return sendSuccess(res, savedParagraphs, 201);
  } catch (error) {
    console.error('Write chapter error:', error);
    const statusCode = error.statusCode || 500;
    return sendError(res, error.message || 'Failed to write chapter', statusCode);
  }
};

/**
 * GET /api/export/:projectId/docx
 */
const exportDocx = async (req, res) => {
  await handleExport(req, res, 'docx');
};

/**
 * GET /api/export/:projectId/pdf
 */
const exportPdf = async (req, res) => {
  await handleExport(req, res, 'pdf');
};

/**
 * Shared export handler
 */
const handleExport = async (req, res, format) => {
  const { projectId } = req.params;

  try {
    // 1. Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.id }
    });

    if (!project) {
      return sendError(res, 'Project not found or access denied', 404);
    }

    // 2. Query paragraphs list for formatting
    const paragraphs = await prisma.paragraph.findMany({
      where: { projectId },
      orderBy: [
        { chapterIndex: 'asc' },
        { paragraphIndex: 'asc' }
      ]
    });

    // 3. Request Python worker with stream response
    const response = await pythonWorkerClient.post(`/internal/export/${format}`, {
      projectId,
      title: project.title,
      trimSize: project.trimSize,
      paragraphs: paragraphs.map(p => ({
        chapterIndex: p.chapterIndex,
        paragraphIndex: p.paragraphIndex,
        formattedHtml: p.formattedHtml
      }))
    }, {
      responseType: 'stream'
    });

    // Set headers
    const contentType = response.headers['content-type'] || 
      (format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf');
    const contentDisposition = response.headers['content-disposition'] || 
      `attachment; filename="project_${projectId}.${format}"`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', contentDisposition);

    // Pipe response
    response.data.pipe(res);
  } catch (error) {
    console.error(`Export ${format} error:`, error);
    const statusCode = error.statusCode || 500;
    // If headers were already sent, just close connection
    if (res.headersSent) {
      return res.end();
    }
    return sendError(res, error.message || `Failed to export project as ${format}`, statusCode);
  }
};

/**
 * POST /api/swarm/adjust-outline
 */
const adjustOutline = async (req, res) => {
  try {
    const parseResult = adjustOutlineSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map(err => err.message).join(', ');
      return sendError(res, errorMsg, 400);
    }

    const { projectId, action, targetChapterCount, feedback } = parseResult.data;

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.id }
    });

    if (!project) {
      return sendError(res, 'Project not found or access denied', 404);
    }

    // Get current outline
    const currentOutline = await prisma.outline.findFirst({
      where: { projectId }
    });

    const currentToC = currentOutline ? currentOutline.tocData : [];

    // Request Python worker to adjust outline
    const response = await pythonWorkerClient.post('/internal/swarm/adjust-outline', {
      projectId,
      action,
      targetChapterCount,
      feedback,
      currentToC
    });

    const adjustedToC = response.data.tocData;

    // Update outline in PostgreSQL
    let outline;
    if (currentOutline) {
      outline = await prisma.outline.update({
        where: { id: currentOutline.id },
        data: { tocData: adjustedToC }
      });
    } else {
      outline = await prisma.outline.create({
        data: {
          projectId,
          tocData: adjustedToC,
          approved: false
        }
      });
    }

    return sendSuccess(res, {
      projectId,
      outlineId: outline.id,
      tocData: adjustedToC
    }, 200);
  } catch (error) {
    console.error('Adjust outline error:', error);
    const statusCode = error.statusCode || 500;
    return sendError(res, error.message || 'Internal server error while adjusting outline', statusCode);
  }
};

const streamSwarmLogs = async (req, res) => {
  const { projectId } = req.params;
  const axios = require('axios');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const workerUrl = `${process.env.PYTHON_WORKER_URL || 'http://localhost:8000'}/internal/logs/${projectId}`;

  try {
    const response = await axios({
      method: 'get',
      url: workerUrl,
      responseType: 'stream'
    });

    response.data.pipe(res);

    req.on('close', () => {
      response.data.destroy();
      res.end();
    });
  } catch (error) {
    console.error('Error proxying logs:', error.message);
    res.write(`data: ${JSON.stringify({ timestamp: new Date().toLocaleTimeString(), level: 'ERROR', message: `Failed to connect to log stream: ${error.message}` })}\n\n`);
    res.end();
  }
};

module.exports = {
  generateOutline,
  approveOutline,
  writeChapter,
  exportDocx,
  exportPdf,
  adjustOutline,
  streamSwarmLogs
};
