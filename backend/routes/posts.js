const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const authenticateToken = require('../middleware/authenticateToken');

// Create a Post (Protected)
router.post('/', authenticateToken, postController.createPost);

// Get All Posts (Public)
router.get('/', postController.getAllPosts);

// Get a Single Post (Public)
router.get('/:id', postController.getPostById);

// Update a Post (Protected)
router.put('/:id', authenticateToken, postController.updatePost);

// Delete a Post (Protected)
router.delete('/:id', authenticateToken, postController.deletePost);

module.exports = router;