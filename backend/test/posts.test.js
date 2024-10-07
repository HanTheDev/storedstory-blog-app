// Mock the Mongoose models before importing the app
jest.mock('../models/Post');
jest.mock('../models/User');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server'); // Import after mocking
const mongoose = require('mongoose')

// Import the mocked models
const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment')

describe('Post API Endpoints', () => {
    let token;
    let initialPostId;
    let mockUserId;

    beforeEach(() => {
        // Clear all instances and mock calls
        jest.clearAllMocks();

        mockUserId = new mongoose.Types.ObjectId().toHexString();
        initialPostId = new mongoose.Types.ObjectId().toHexString();

        // Mock User model's constructor and save method
        User.mockImplementation(() => {
            return {
                save: jest.fn().mockResolvedValue({
                    _id: mockUserId,
                    username: 'testuser',
                    email: 'testuser@example.com',
                    password: 'hashedpassword', // Assuming password is hashed
                }),
            };
        });

        // Mock Post model's constructor and save method
        Post.mockImplementation(() => {
            return {
                save: jest.fn().mockResolvedValue({
                    _id: initialPostId,
                    title: 'Test Post',
                    content: 'Test content',
                    author: mockUserId,
                }),
            };
        });

        // Generate mocked token
        token = jwt.sign({ id: mockUserId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    });

    describe('POST /posts', () => {
        it('should create a new post', async () => {
            // Override the save method for this specific test
            Post.mockImplementationOnce(() => {
                return {
                    save: jest.fn().mockResolvedValue({
                        _id: 'newMockedPostId',
                        title: 'New Test Post',
                        content: 'This is a new test post.',
                        author: mockUserId,
                    }),
                };
            });

            const res = await request(app)
                .post('/posts')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    title: 'New Test Post',
                    content: 'This is a new test post.',
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('title', 'New Test Post');
            expect(res.body).toHaveProperty('_id', 'newMockedPostId');
            expect(Post).toHaveBeenCalledWith({
                title: 'New Test Post',
                content: 'This is a new test post.',
                author: mockUserId,
            });
        });
    });

    describe('GET /posts', () => {
        it('should GET all posts', async () => {
            // Mock the Post.find method
            Post.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue([
                    {
                        _id: initialPostId,
                        title: 'Test Post',
                        content: 'Test content',
                        author: mockUserId,
                    },
                ]),
            });

            const res = await request(app).get('/posts');
            // console.log(res.body)

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
            expect(Post.find).toHaveBeenCalled();
        });
    });

    describe('GET /posts/:id', () => {
        it('should GET a single post', async () => {
            // Correctly mock the Post.findById().populate() chain
            Post.findById = jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue({
                    _id: initialPostId,
                    title: 'Test Post',
                    content: 'Test content',
                    author: mockUserId,
                }),
            });

            const res = await request(app).get(`/posts/${initialPostId}`);
            // console.log(res.body); // Should log the mocked post data

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('title', 'Test Post');
            expect(Post.findById).toHaveBeenCalledWith(initialPostId);
            expect(Post.findById().populate).toHaveBeenCalledWith('author', 'username'); // Adjust if different
        });

        it('should NOT GET a post with invalid ID', async () => {
            const res = await request(app).get('/posts/invalidId');
            // console.log(res.body); // Should log { message: 'Post not found' }

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('message', 'Post not found');
            expect(Post.findById().populate).not.toHaveBeenCalledWith(); // Adjust if different
        });
    });

    describe('PUT /posts/:id', () => {
        it('should update a post', async () => {
            const updatedMockPost = {
                _id: initialPostId,
                title: 'Updated Test Post',
                content: 'Updated content',
                author: mockUserId,
            };
    
            // Mock Post.findById to return a post object with a mocked save method
            const saveMock = jest.fn().mockResolvedValue(updatedMockPost);
            Post.findById = jest.fn().mockReturnValue({
                author: mockUserId,
                save: saveMock,
            });
    
            const res = await request(app)
                .put(`/posts/${initialPostId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    title: 'Updated Test Post',
                    content: 'Updated content',
                });
    
            // console.log('PUT /posts/:id Response:', res.body);
    
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('title', 'Updated Test Post');
            expect(res.body).toHaveProperty('content', 'Updated content');
            expect(res.body).toHaveProperty('_id', initialPostId);
            expect(res.body).toHaveProperty('author', mockUserId);
    
            // Ensure that findById was called correctly
            expect(Post.findById).toHaveBeenCalledWith(initialPostId);
            // Ensure that save was called on the post object
            expect(saveMock).toHaveBeenCalled();
        });
    
        it('should return 404 when updating a non-existent post', async () => {
            // Mock Post.findById to return null (post not found)
            Post.findById = jest.fn().mockResolvedValue(null);
    
            const res = await request(app)
                .put('/posts/507f1f77bcf86cd799439011') // Example ObjectId
                .set('Authorization', `Bearer ${token}`)
                .send({
                    title: 'Should Fail',
                    content: 'This post does not exist.',
                });
    
            // console.log('PUT /posts/507f1f77bcf86cd799439011 Response:', res.body);
    
            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('message', 'Post not found');
            expect(Post.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
        });
    
        it('should return 401 when updating a post not owned by the user', async () => {
            // Mock Post.findById to return a post owned by a different user
            Post.findById = jest.fn().mockReturnValue({
                author: 'differentUserId', // Different from mockUserId
                save: jest.fn(), // save should not be called
            });
    
            const res = await request(app)
                .put(`/posts/${initialPostId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    title: 'Updated Test Post',
                    content: 'Updated content',
                });
    
            // console.log('PUT /posts/:id (Unauthorized) Response:', res.body);
    
            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('message', 'User not authorized');
            expect(Post.findById).toHaveBeenCalledWith(initialPostId);
        });
    });
    
    describe('DELETE /posts/:id', () => {
        it('should delete a corresponding post', async () => {
            // Mock the Post.findById method
            Post.findById = jest.fn().mockResolvedValue({
                _id: initialPostId,
                title: 'Test Post',
                content: 'Test content',
                author: mockUserId,
                deleteOne: jest.fn().mockResolvedValue(null),
            });

            // If there are cascading deletes, mock them as needed
            // For example, mock Comment.deleteMany or similar
            Comment.deleteMany = jest.fn().mockReturnValue(null)

            const res = await request(app)
                .delete(`/posts/${initialPostId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Post and associated comments removed');
            expect(Post.findById).toHaveBeenCalledWith(initialPostId);
            expect(Comment.deleteMany).toHaveBeenCalledWith({ post: initialPostId });
        });

        it('should return 404 when deleting a non-existent post', async () => {
            // Mock the Post.findByIdAndDelete method to return null
            Post.findById = jest.fn().mockResolvedValue(null);

            const nonExistentId = '507f1f77bcf86cd799439011';
            const res = await request(app)
                .delete(`/posts/${nonExistentId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('message'); // Adjust based on your actual response
            expect(Post.findById).toHaveBeenCalledWith(nonExistentId);
        });
    });
});
