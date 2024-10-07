const Post = require('../models/Post');
const Comment = require('../models/Comment');
const mongoose = require('mongoose');

// Create a Post
exports.createPost = async (req, res) => {
    const { title, content } = req.body;

    try {
        const post = new Post({
            title,
            content,
            author: req.user.id,
        });
        const savedPost = await post.save();
        res.status(201).json(savedPost);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get All Posts
exports.getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find().populate('author', 'username');
        res.json(posts);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get a Single Post
exports.getPostById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const post = await Post.findById(req.params.id).populate('author', 'username');
        if (!post) return res.status(404).json({ message: 'Post not found' });
        res.json(post);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updatePost = async (req, res) => {
    const { title, content } = req.body;

    try {
        // Find the post and make sure it's owned by the authenticated user
        let post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        if (post.author.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        // Update the post fields
        post.title = title || post.title;
        post.content = content || post.content;

        const updatedPost = await post.save();
        res.json(updatedPost);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deletePost = async (req, res) => {
    try {
        // Find the post and make sure it's owned by the authenticated user
        let post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        if (post.author.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        // // Delete associated comments
        await Comment.deleteMany({ post: req.params.id });

        // // Delete the post
        await post.deleteOne();

        res.json({ message: 'Post and associated comments removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};