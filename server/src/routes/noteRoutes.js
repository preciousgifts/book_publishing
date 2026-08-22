const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const { getNotes, createNote, updateNote, deleteNote } = require('../controllers/noteController');

router.use(authenticateToken);

router.get('/:projectId', getNotes);
router.post('/', createNote);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);

module.exports = router;
