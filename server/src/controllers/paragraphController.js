const { z } = require('zod');
const prisma = require('../config/db');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const updateParagraphSchema = z.object({
  rawContent: z.string(),
  formattedHtml: z.string()
});

const progressSchema = z.object({
  projectId: z.string().uuid({ message: 'Invalid project ID' }),
  activeChapterIndex: z.number().int().min(0).default(0),
  activeParagraphIndex: z.number().int().min(0).default(0),
  playbackSpeed: z.number().min(0.1).max(5.0).default(1.0),
  selectedVoice: z.string().default('')
});

/**
 * PUT /api/paragraphs/:id
 */
const updateParagraph = async (req, res) => {
  const { id } = req.params;
  
  try {
    const parseResult = updateParagraphSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map(err => err.message).join(', ');
      return sendError(res, errorMsg, 400);
    }

    const { rawContent, formattedHtml } = parseResult.data;

    // Verify paragraph exists and project ownership via relation
    const paragraph = await prisma.paragraph.findFirst({
      where: {
        id,
        project: {
          userId: req.user.id
        }
      }
    });

    if (!paragraph) {
      return sendError(res, 'Paragraph not found or access denied', 404);
    }

    // Update paragraph
    const updatedParagraph = await prisma.paragraph.update({
      where: { id },
      data: {
        rawContent,
        formattedHtml
      }
    });

    return sendSuccess(res, updatedParagraph);
  } catch (error) {
    console.error('Update paragraph error:', error);
    return sendError(res, 'Internal server error while updating paragraph', 500);
  }
};

/**
 * POST /api/progress
 */
const updateProgress = async (req, res) => {
  try {
    const parseResult = progressSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map(err => err.message).join(', ');
      return sendError(res, errorMsg, 400);
    }

    const { projectId, activeChapterIndex, activeParagraphIndex, playbackSpeed, selectedVoice } = parseResult.data;

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: req.user.id
      }
    });

    if (!project) {
      return sendError(res, 'Project not found or access denied', 404);
    }

    // Upsert user progress
    const progress = await prisma.userProgress.upsert({
      where: { projectId },
      update: {
        activeChapterIndex,
        activeParagraphIndex,
        playbackSpeed,
        selectedVoice
      },
      create: {
        projectId,
        activeChapterIndex,
        activeParagraphIndex,
        playbackSpeed,
        selectedVoice
      }
    });

    return sendSuccess(res, progress);
  } catch (error) {
    console.error('Update progress error:', error);
    return sendError(res, 'Internal server error while updating progress', 500);
  }
};

module.exports = {
  updateParagraph,
  updateProgress
};
