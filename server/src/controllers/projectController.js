const { z } = require('zod');
const prisma = require('../config/db');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const createProjectSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  genre: z.enum(['fiction', 'non-fiction'], { message: 'Genre must be fiction or non-fiction' }),
  languageLocale: z.string().default('en-US'),
  trimSize: z.string().default('6x9')
});

/**
 * GET /api/projects
 */
const getProjects = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' }
    });
    
    return sendSuccess(res, projects);
  } catch (error) {
    console.error('Fetch projects error:', error);
    return sendError(res, 'Internal server error while fetching projects', 500);
  }
};

/**
 * POST /api/projects
 */
const createProject = async (req, res) => {
  try {
    const parseResult = createProjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map(err => err.message).join(', ');
      return sendError(res, errorMsg, 400);
    }

    const { title, genre, languageLocale, trimSize } = parseResult.data;

    // Use Prisma transaction to create project and user progress atomically
    const result = await prisma.$transaction(async (tx) => {
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

      await tx.userProgress.create({
        data: {
          projectId: project.id,
          activeChapterIndex: 0,
          activeParagraphIndex: 0,
          playbackSpeed: 1.0,
          selectedVoice: ''
        }
      });

      return project;
    });

    return sendSuccess(res, result, 201);
  } catch (error) {
    console.error('Create project error:', error);
    return sendError(res, 'Internal server error while creating project', 500);
  }
};

/**
 * GET /api/projects/:id
 */
const getProjectById = async (req, res) => {
  const { id } = req.params;
  
  try {
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: req.user.id
      },
      include: {
        outlines: true,
        paragraphs: {
          orderBy: [
            { chapterIndex: 'asc' },
            { paragraphIndex: 'asc' }
          ]
        },
        userProgress: true
      }
    });

    if (!project) {
      return sendError(res, 'Project not found or access denied', 404);
    }

    // Map approved outline or latest outline to project.outline
    const outlines = project.outlines || [];
    const approvedOutline = outlines.find(o => o.approved) || outlines[outlines.length - 1];
    const projectData = {
      ...project,
      outline: approvedOutline || null
    };

    return sendSuccess(res, projectData);
  } catch (error) {
    console.error('Get project detail error:', error);
    return sendError(res, 'Internal server error while retrieving project', 500);
  }
};

/**
 * DELETE /api/projects/:id
 */
const deleteProject = async (req, res) => {
  const { id } = req.params;

  try {
    // Confirm ownership and project exists
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!project) {
      return sendError(res, 'Project not found or access denied', 404);
    }

    // Prisma relation onDelete: Cascade is defined on Project fields in schema,
    // so we can delete the project and it will cascade delete outlines, paragraphs, and userProgress.
    await prisma.project.delete({
      where: { id }
    });

    return sendSuccess(res, { message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    return sendError(res, 'Internal server error while deleting project', 500);
  }
};

module.exports = {
  getProjects,
  createProject,
  getProjectById,
  deleteProject
};
