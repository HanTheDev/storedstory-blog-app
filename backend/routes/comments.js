const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController')
const authenticateToken = require('../middleware/authenticateToken');

// Add a Comment to a Post (Protected)
router.post('/:postId', authenticateToken, commentController.createComment);

// Get All Comments for a Post (Public)
router.get('/:postId', commentController.getCommentsFromOnePost);

// Update a Comment (Protected)
router.put('/:id', authenticateToken, commentController.updateComment);

// Delete a Comment (Protected)
router.delete('/:id', authenticateToken, commentController.deleteComment);

module.exports = router;
