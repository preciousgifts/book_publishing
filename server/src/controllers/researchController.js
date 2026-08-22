const prisma = require('../config/db');
const pythonWorkerClient = require('../utils/pythonWorkerClient');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * POST /api/research/generate
 */
const generateResearch = async (req, res) => {
  try {
    const { projectId, topic, bookType = 'non-fiction', workingTitle = '', constraints = '' } = req.body;

    if (!topic || !topic.trim()) {
      return sendError(res, 'Research topic is required.', 400);
    }

    // 1. If no projectId provided, create or use temporary project ID context
    let targetProjectId = projectId;
    if (!targetProjectId) {
      const proj = await prisma.project.create({
        data: {
          userId: req.user.id,
          title: workingTitle || `Research: ${topic.slice(0, 30)}`,
          genre: bookType === 'fiction' ? 'fiction' : 'non-fiction',
          status: 'outline_pending'
        }
      });
      targetProjectId = proj.id;
    }

    // 2. Call Python worker research endpoint
    const pythonRes = await pythonWorkerClient.post('/internal/research/generate', {
      projectId: targetProjectId,
      topic,
      bookType,
      workingTitle,
      constraints
    });

    if (!pythonRes.data || !pythonRes.data.reportData) {
      throw new Error('Failed to generate research report from Python worker.');
    }

    const reportData = pythonRes.data.reportData;
    const finalTitle = reportData?.bookObjective?.workingTitle || workingTitle || `Research: ${topic.slice(0, 30)}`;

    // 3. Upsert research report into PostgreSQL using Prisma & update project title
    const savedReport = await prisma.researchReport.upsert({
      where: { projectId: targetProjectId },
      update: { reportData },
      create: {
        projectId: targetProjectId,
        reportData
      }
    });

    await prisma.project.update({
      where: { id: targetProjectId },
      data: { title: finalTitle }
    });

    return sendSuccess(res, {
      projectId: targetProjectId,
      reportId: savedReport.id,
      reportData
    }, 200);
  } catch (error) {
    console.error('Generate research error:', error);
    return sendError(res, error.message || 'Internal server error during research generation', 500);
  }
};

/**
 * GET /api/research/:projectId
 */
const getResearchReport = async (req, res) => {
  try {
    const { projectId } = req.params;

    const report = await prisma.researchReport.findUnique({
      where: { projectId }
    });

    if (!report) {
      return sendError(res, 'No research report found for this project.', 404);
    }

    return sendSuccess(res, {
      projectId,
      reportId: report.id,
      reportData: report.reportData
    }, 200);
  } catch (error) {
    console.error('Get research report error:', error);
    return sendError(res, 'Internal server error while fetching research report', 500);
  }
};

/**
 * POST /api/research/use-in-outline
 * Injects research report summary into outline generation concept
 */
const injectResearchIntoOutline = async (req, res) => {
  try {
    const { projectId, selectedTitle, customPrompt, genre } = req.body;

    const report = await prisma.researchReport.findUnique({
      where: { projectId }
    });

    if (!report) {
      return sendError(res, 'No research report found for this project.', 404);
    }

    const data = report.reportData || {};
    const finalTitle = selectedTitle || data.bookObjective?.workingTitle || 'Researched Book Project';
    const finalGenre = genre || data.bookObjective?.bookCategory || 'non-fiction';

    const summaryStr = `
BOOK RESEARCH BASIS:
- Chosen Working Title: ${finalTitle}
- Executive Summary: ${data.executiveSummary || ''}
- Target Reader: ${data.bookObjective?.targetReader || ''}
- Key Pain Points: ${JSON.stringify(data.readerPainPoints || [])}
- Recommended Chapter Structure: ${JSON.stringify(data.outlineResearch?.suggestedStructure || [])}
${customPrompt ? `- Author Directions: ${customPrompt}` : ''}
`;

    // Trigger outline generation with research concept
    const pythonRes = await pythonWorkerClient.post('/internal/swarm/outline', {
      projectId,
      prompt: summaryStr,
      genre: finalGenre,
      title: finalTitle
    });

    if (!pythonRes.data || !pythonRes.data.toc_data) {
      throw new Error('Failed to generate outline from research data.');
    }

    const tocData = {
      toc: pythonRes.data.toc_data,
      discoveryQuestions: pythonRes.data.discovery_questions || []
    };

    const outline = await prisma.outline.create({
      data: {
        projectId,
        tocData,
        approved: true
      }
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { 
        status: 'in_progress',
        title: finalTitle,
        genre: finalGenre
      }
    });

    return sendSuccess(res, {
      projectId,
      outlineId: outline.id,
      tocData
    }, 200);
  } catch (error) {
    console.error('Inject research into outline error:', error);
    return sendError(res, error.message || 'Failed to generate outline from research', 500);
  }
};

/**
 * GET /api/research
 * Returns all research reports created for the user's projects
 */
const getAllResearchReports = async (req, res) => {
  try {
    const userProjects = await prisma.project.findMany({
      where: { userId: req.user.id },
      select: { id: true }
    });
    const projectIds = userProjects.map(p => p.id);

    const reports = await prisma.researchReport.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: 'desc' },
      include: {
        project: {
          select: { id: true, title: true, createdAt: true }
        }
      }
    });

    return sendSuccess(res, reports, 200);
  } catch (error) {
    console.error('Get all research reports error:', error);
    return sendError(res, 'Failed to fetch research reports history', 500);
  }
};

/**
 * DELETE /api/research/:projectId
 */
const deleteResearchReport = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.id }
    });

    if (!project) {
      return sendError(res, 'Project not found or access denied', 404);
    }

    await prisma.researchReport.deleteMany({
      where: { projectId }
    });

    return sendSuccess(res, { message: 'Research report deleted successfully.' }, 200);
  } catch (error) {
    console.error('Delete research report error:', error);
    return sendError(res, 'Failed to delete research report', 500);
  }
};

module.exports = {
  generateResearch,
  getResearchReport,
  getAllResearchReports,
  injectResearchIntoOutline,
  deleteResearchReport
};
