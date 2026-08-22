const prisma = require('../config/db');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * GET /api/notes/:projectId
 */
const getNotes = async (req, res) => {
  try {
    const { projectId } = req.params;
    const notes = await prisma.note.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' }
    });
    return sendSuccess(res, notes, 200);
  } catch (error) {
    console.error('Get notes error:', error);
    return sendError(res, 'Failed to fetch notes', 500);
  }
};

/**
 * POST /api/notes
 */
const createNote = async (req, res) => {
  try {
    const { projectId, title, content } = req.body;
    if (!projectId || !title) {
      return sendError(res, 'Project ID and title are required.', 400);
    }
    const note = await prisma.note.create({
      data: {
        projectId,
        title,
        content: content || ''
      }
    });
    return sendSuccess(res, note, 201);
  } catch (error) {
    console.error('Create note error:', error);
    return sendError(res, 'Failed to create note', 500);
  }
};

/**
 * PUT /api/notes/:id
 */
const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const note = await prisma.note.update({
      where: { id },
      data: { title, content }
    });
    return sendSuccess(res, note, 200);
  } catch (error) {
    console.error('Update note error:', error);
    return sendError(res, 'Failed to update note', 500);
  }
};

/**
 * DELETE /api/notes/:id
 */
const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.note.delete({
      where: { id }
    });
    return sendSuccess(res, { message: 'Note deleted' }, 200);
  } catch (error) {
    console.error('Delete note error:', error);
    return sendError(res, 'Failed to delete note', 500);
  }
};

module.exports = {
  getNotes,
  createNote,
  updateNote,
  deleteNote
};
