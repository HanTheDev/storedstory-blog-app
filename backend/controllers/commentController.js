const Comment = require('../models/Comment');
const Post = require('../models/Post');

exports.createComment = async (req, res) => {
    const { content } = req.body;

    try {
        // Find the post to comment on
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        // Create new comment
        const comment = new Comment({
            content,
            author: req.user.id,
            post: req.params.postId,
        });

        // Save the comment
        const savedComment = await comment.save();
        res.status(201).json(savedComment);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getCommentsFromOnePost = async (req, res) => {
    try {
        // Find the post to comment on
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        // Get all comments for the given post and populate the author field
        const comments = await Comment.find({ post: req.params.postId }).populate('author', 'username');
        res.json(comments);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateComment = async (req, res) => {
    const { content } = req.body;

    try {
        // Find the comment and make sure it's owned by the authenticated user
        let comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });
        if (comment.author.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        // Update the comment content
        comment.content = content || comment.content;

        const updatedComment = await comment.save();
        res.json(updatedComment);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteComment = async (req, res) => {
    try {
        // Find the comment and make sure it's owned by the authenticated user
        let comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });
        if (comment.author.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        await comment.deleteOne();
        res.json({ message: 'Comment removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};