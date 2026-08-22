const prisma = require('../config/db');
const axios = require('axios');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { FULL_MATTER_CATALOG, getRecommendedDefaults } = require('../config/frontMatterCatalog');

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

/**
 * Seed 17 catalog entries for a new or existing project
 */
async function seedMatterPagesForProject(txOrPrisma, projectId, bookType = 'non-fiction', customSelections = null) {
  const recommendedTypes = new Set(getRecommendedDefaults(bookType));

  const pageDataList = FULL_MATTER_CATALOG.map((cat) => {
    const isIncluded = customSelections
      ? Boolean(customSelections[cat.pageType]?.included ?? customSelections[cat.pageType])
      : recommendedTypes.has(cat.pageType);

    const initialInputs = (customSelections && customSelections[cat.pageType]?.authorInputs)
      ? customSelections[cat.pageType].authorInputs
      : {};

    return {
      projectId,
      pageType: cat.pageType,
      section: cat.section,
      order: cat.defaultOrder,
      included: isIncluded,
      status: 'NOT_GENERATED',
      content: '',
      authorInputs: initialInputs,
      generatedWithHumanizer: false
    };
  });

  // Create many using createMany or transaction
  await txOrPrisma.bookMatterPage.createMany({
    data: pageDataList,
    skipDuplicates: true
  });

  return txOrPrisma.bookMatterPage.findMany({
    where: { projectId },
    orderBy: [
      { section: 'asc' },
      { order: 'asc' }
    ]
  });
}

/**
 * GET /api/projects/:projectId/matter
 */
const getMatterPages = async (req, res) => {
  const { projectId } = req.params;

  try {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.id }
    });

    if (!project) {
      return sendError(res, 'Project not found or access denied', 404);
    }

    let matterPages = await prisma.bookMatterPage.findMany({
      where: { projectId },
      orderBy: [
        { section: 'asc' },
        { order: 'asc' }
      ]
    });

    // Auto-seed if legacy project without matter pages
    if (!matterPages || matterPages.length === 0) {
      matterPages = await seedMatterPagesForProject(prisma, projectId, project.genre);
    }

    return sendSuccess(res, matterPages);
  } catch (error) {
    console.error('Get matter pages error:', error);
    return sendError(res, 'Failed to fetch front/back matter pages', 500);
  }
};

/**
 * PATCH /api/projects/:projectId/matter/:id
 */
const updateMatterPage = async (req, res) => {
  const { projectId, id } = req.params;
  const { included, authorInputs, content, status, order } = req.body;

  try {
    const page = await prisma.bookMatterPage.findFirst({
      where: { id, projectId, project: { userId: req.user.id } }
    });

    if (!page) {
      return sendError(res, 'Matter page not found or access denied', 404);
    }

    const updateData = {};
    if (typeof included === 'boolean') updateData.included = included;
    if (authorInputs !== undefined) updateData.authorInputs = authorInputs;
    if (content !== undefined) updateData.content = content;
    if (status !== undefined) updateData.status = status;
    if (typeof order === 'number') updateData.order = order;

    const updated = await prisma.bookMatterPage.update({
      where: { id },
      data: updateData
    });

    return sendSuccess(res, updated);
  } catch (error) {
    console.error('Update matter page error:', error);
    return sendError(res, 'Failed to update matter page', 500);
  }
};

/**
 * POST /api/projects/:projectId/matter/batch-toggle
 */
const batchUpdateMatterPages = async (req, res) => {
  const { projectId } = req.params;
  const { items } = req.body; // Array of { id, included, order, authorInputs }

  if (!Array.isArray(items)) {
    return sendError(res, 'items must be an array', 400);
  }

  try {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.id }
    });

    if (!project) {
      return sendError(res, 'Project not found or access denied', 404);
    }

    await prisma.$transaction(
      items.map((item) => {
        const data = {};
        if (typeof item.included === 'boolean') data.included = item.included;
        if (typeof item.order === 'number') data.order = item.order;
        if (item.authorInputs !== undefined) data.authorInputs = item.authorInputs;

        return prisma.bookMatterPage.update({
          where: { id: item.id },
          data
        });
      })
    );

    const updatedPages = await prisma.bookMatterPage.findMany({
      where: { projectId },
      orderBy: [
        { section: 'asc' },
        { order: 'asc' }
      ]
    });

    return sendSuccess(res, updatedPages);
  } catch (error) {
    console.error('Batch update matter pages error:', error);
    return sendError(res, 'Failed to batch update matter pages', 500);
  }
};

/**
 * POST /api/projects/:projectId/matter/:id/generate
 */
const generateMatterPage = async (req, res) => {
  const { projectId, id } = req.params;
  const { humanizeOverride, customInstruction } = req.body;

  try {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.id },
      include: {
        outlines: true,
        paragraphs: {
          orderBy: [
            { chapterIndex: 'asc' },
            { paragraphIndex: 'asc' }
          ]
        }
      }
    });

    if (!project) {
      return sendError(res, 'Project not found or access denied', 404);
    }

    const matterPage = await prisma.bookMatterPage.findFirst({
      where: { id, projectId }
    });

    if (!matterPage) {
      return sendError(res, 'Matter page not found', 404);
    }

    // Determine humanizer setting
    const useHumanizer = (typeof humanizeOverride === 'boolean')
      ? humanizeOverride
      : project.humanizeOutput;

    // Get chapter outline / content context
    const approvedOutline = project.outlines.find(o => o.approved) || project.outlines[project.outlines.length - 1];
    const tocList = approvedOutline?.tocData?.toc || [];

    // Call FastAPI swarm worker
    const swarmResponse = await axios.post(`${FASTAPI_URL}/internal/swarm/write-matter-page`, {
      projectId,
      pageType: matterPage.pageType,
      title: project.title,
      genre: project.genre,
      languageLocale: project.languageLocale,
      authorInputs: matterPage.authorInputs || {},
      tocList,
      paragraphsCount: project.paragraphs.length,
      paragraphsSample: project.paragraphs.slice(0, 30).map(p => ({
        chapterIndex: p.chapterIndex,
        rawContent: p.rawContent || p.formattedHtml
      })),
      customInstruction: customInstruction || null,
      humanizeOutput: useHumanizer
    });

    const generatedContent = swarmResponse.data?.content || '';

    // Update matter page record with GENERATED_PENDING_REVIEW
    const updatedPage = await prisma.bookMatterPage.update({
      where: { id },
      data: {
        content: generatedContent,
        status: 'GENERATED_PENDING_REVIEW',
        generatedWithHumanizer: useHumanizer
      }
    });

    return sendSuccess(res, updatedPage);
  } catch (error) {
    console.error('Generate matter page error:', error?.response?.data || error.message);
    return sendError(res, `Failed to generate matter page: ${error?.response?.data?.detail || error.message}`, 500);
  }
};

/**
 * POST /api/projects/:projectId/matter/generate-all
 */
const generateAllMatterPages = async (req, res) => {
  const { projectId } = req.params;
  const { humanizeOverride } = req.body;

  try {
    const matterPages = await prisma.bookMatterPage.findMany({
      where: { projectId, included: true }
    });

    const results = [];
    for (const page of matterPages) {
      // Internal call logic per page
      const fakeReq = {
        params: { projectId, id: page.id },
        user: req.user,
        body: { humanizeOverride }
      };
      // Reuse handler or process directly
      try {
        await generateMatterPage(fakeReq, {
          json: (data) => results.push(data),
          status: () => ({ json: (errData) => results.push(errData) })
        });
      } catch (e) {
        console.error(`Failed generation for ${page.pageType}`, e);
      }
    }

    const updatedPages = await prisma.bookMatterPage.findMany({
      where: { projectId },
      orderBy: [
        { section: 'asc' },
        { order: 'asc' }
      ]
    });

    return sendSuccess(res, updatedPages);
  } catch (error) {
    console.error('Generate all matter pages error:', error);
    return sendError(res, 'Failed to generate included matter pages', 500);
  }
};

/**
 * POST /api/projects/:projectId/matter/:id/approve
 */
const approveMatterPage = async (req, res) => {
  const { projectId, id } = req.params;

  try {
    const page = await prisma.bookMatterPage.findFirst({
      where: { id, projectId, project: { userId: req.user.id } }
    });

    if (!page) {
      return sendError(res, 'Matter page not found or access denied', 404);
    }

    const updated = await prisma.bookMatterPage.update({
      where: { id },
      data: { status: 'APPROVED' }
    });

    return sendSuccess(res, updated);
  } catch (error) {
    console.error('Approve matter page error:', error);
    return sendError(res, 'Failed to approve matter page', 500);
  }
};

module.exports = {
  seedMatterPagesForProject,
  getMatterPages,
  updateMatterPage,
  batchUpdateMatterPages,
  generateMatterPage,
  generateAllMatterPages,
  approveMatterPage
};
