const prisma = require('../config/db');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * GET /api/style-guide/:projectId
 */
const getStyleGuide = async (req, res) => {
  try {
    const { projectId } = req.params;
    let guide = await prisma.styleGuide.findUnique({
      where: { projectId }
    });

    if (!guide) {
      guide = await prisma.styleGuide.create({
        data: {
          projectId,
          tone: 'informative',
          pov: 'third-person',
          targetReadability: 'general',
          styleRules: {}
        }
      });
    }

    return sendSuccess(res, guide, 200);
  } catch (error) {
    console.error('Get style guide error:', error);
    return sendError(res, 'Failed to fetch style guide', 500);
  }
};

/**
 * POST /api/style-guide
 */
const upsertStyleGuide = async (req, res) => {
  try {
    const { projectId, tone, pov, targetReadability, styleRules } = req.body;
    if (!projectId) {
      return sendError(res, 'Project ID is required.', 400);
    }

    const guide = await prisma.styleGuide.upsert({
      where: { projectId },
      update: {
        tone,
        pov,
        targetReadability,
        styleRules: styleRules || {}
      },
      create: {
        projectId,
        tone: tone || 'informative',
        pov: pov || 'third-person',
        targetReadability: targetReadability || 'general',
        styleRules: styleRules || {}
      }
    });

    return sendSuccess(res, guide, 200);
  } catch (error) {
    console.error('Upsert style guide error:', error);
    return sendError(res, 'Failed to save style guide', 500);
  }
};

module.exports = {
  getStyleGuide,
  upsertStyleGuide
};
