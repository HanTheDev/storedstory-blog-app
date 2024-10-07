jest.mock('../models/Post');
jest.mock('../models/User');
jest.mock('../models/Comment');

const request = require('supertest')
const jwt = require('jsonwebtoken')
const app = require('../server')
const mongoose = require('mongoose')

const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');

describe('Comment API Endpoints ', () => {
    let token_user1;
    let token_user2;
    let initialPostId;
    let mockUserId;
    let mockUserId_2;
    let initialCommentId;

    beforeEach(() => {
        jest.clearAllMocks();

        mockUserId = new mongoose.Types.ObjectId().toHexString();
        mockUserId_2 = new mongoose.Types.ObjectId().toHexString();
        initialPostId = new mongoose.Types.ObjectId().toHexString();
        initialCommentId = new mongoose.Types.ObjectId().toHexString();

        User.mockImplementation(() => {
            save: jest.fn().mockResolvedValue({
                _id: mockUserId,
                username: 'testuser',
                email: 'testuser@example.com',
                password: 'hashedpassword', // Assuming password is hashed
            })
        })

        User.mockImplementation(() => {
            save: jest.fn().mockResolvedValue({
                _id: mockUserId_2,
                username: 'testuser_2',
                email: 'testuser_2@example.com',
                password: 'hashedpassword', // Assuming password is hashed
            })
        })

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

        Comment.mockImplementation(() => {
            save: jest.fn().mockResolvedValue({
                _id: initialCommentId,
                content: 'Test Comment',
                author: mockUserId_2,
                post: initialPostId
            })
        })

        token_user1 = jwt.sign({ id: mockUserId }, process.env.JWT_SECRET, { expiresIn: '1h' });
        token_user2 = jwt.sign({ id: mockUserId_2 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    })

    describe('POST /comments/:postId', () => {
        it('should create a new comment in a Post', async () => {
            Post.findById = jest.fn().mockResolvedValue({
                _id: initialPostId,
                title: 'Test Post',
                content: 'Test content',
                author: mockUserId,
            })

            Comment.mockImplementationOnce(() => {
                return {
                    save: jest.fn().mockResolvedValue({
                        _id: 'newCommentId',
                        content: 'New Test Comment',
                        author: mockUserId_2,
                        post: initialPostId
                    })
                }
            })

            const res = await request(app)
                .post(`/comments/${initialPostId}`)
                .set('Authorization', `Bearer ${token_user2}`)
                .send({
                    content: 'New Test Comment'
                })

            expect(res.status).toBe(201)
            expect(res.body).toHaveProperty('content', 'New Test Comment')
            expect(Comment).toHaveBeenCalledWith({
                content: 'New Test Comment',
                author: mockUserId_2,
                post: initialPostId
            })
        })
    })

    describe('GET /comments/:postId', () => {
        it('should get all comments from a Post', async () => {
            Post.findById = jest.fn().mockResolvedValue({
                _id: initialPostId,
                title: 'Test Post',
                content: 'Test content',
                author: mockUserId,
            })

            Comment.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue({
                    _id: initialCommentId,
                    content: 'Test Comment',
                    author: mockUserId_2,
                    post: initialPostId
                })
            })

            const res = await request(app).get(`/comments/${initialPostId}`)

            expect(res.status).toBe(200)
            expect(res.body).toHaveProperty('content', 'Test Comment');
            expect(Post.findById).toHaveBeenCalledWith(initialPostId);
            expect(Comment.find().populate).toHaveBeenCalledWith('author', 'username');
        })

        it('should NOT GET a comment due to not founded post', async () => {
            Post.findById = jest.fn().mockResolvedValue(null);

            const res = await request(app).get('/comments/invalidId')
            
            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('message', 'Post not found');
            expect(Comment.find().populate).not.toHaveBeenCalledWith(); // Adjust if different
        })
    })

    describe('UPDATE /comments/:commentId', () => {
        it('should update a comment', async () => {
            const updatedMockComment = {
                _id: initialCommentId,
                content: 'Updated comment',
                author: mockUserId_2,
                post: initialPostId
            };

            const saveMock = jest.fn().mockResolvedValue(updatedMockComment);
            Comment.findById = jest.fn().mockReturnValue({
                author: mockUserId_2,
                save: saveMock
            })

            const res = await request(app)
                .put(`/comments/${initialCommentId}`)
                .set('Authorization', `Bearer ${token_user2}`)
                .send({
                    content: 'Updated comment',
                })

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('content', 'Updated comment');
            expect(res.body).toHaveProperty('_id', initialCommentId);
            expect(res.body).toHaveProperty('author', mockUserId_2);

            // Ensure that findById was called correctly
            expect(Comment.findById).toHaveBeenCalledWith(initialCommentId);
            // Ensure that save was called on the post object
            expect(saveMock).toHaveBeenCalled();
        })

        it('should NOT UPDATE a comment because post not found', async () => {
            Comment.findById = jest.fn().mockResolvedValue(null)

            const res = await request(app)
                .put(`/comments/invalidId`)
                .set('Authorization', `Bearer ${token_user2}`)
                .send({
                    title: 'Should Fail',
                    content: 'This post does not exist.',
                })

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('message', 'Comment not found');
            expect(Comment.findById).toHaveBeenCalledWith('invalidId');
        })

        it('should return 401 when updated using unauthorized user', async () => {
            Comment.findById = jest.fn().mockReturnValue({
                author: 'differentUserId',
                save: jest.fn()
            })

            const res = await request(app)
                .put(`/comments/${initialCommentId}`)
                .set('Authorization', `Bearer ${token_user2}`)
                .send({
                    content: 'Updated comment',
                });

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('message', 'User not authorized');
            expect(Comment.findById).toHaveBeenCalledWith(initialCommentId);
        })
    })

    describe('DELETE /comments/:commentId', () => {
        it('should delete a comment', async () => {
            Comment.findById = jest.fn().mockResolvedValue({
                _id: initialCommentId,
                content: 'Updated comment',
                author: mockUserId_2,
                post: initialPostId,
                deleteOne: jest.fn().mockResolvedValue(null)
            })

            const res = await request(app)
                .delete(`/comments/${initialCommentId}`)
                .set('Authorization', `Bearer ${token_user2}`)

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Comment removed');
            expect(Comment.findById).toHaveBeenCalledWith(initialCommentId);
        })
        
        it('should return 404 when deleting a non-existent comment', async () => {
            Comment.findById = jest.fn().mockResolvedValue(null)

            const nonExistentId = '507f1f77bcf86cd799439011';
            const res = await request(app)
                .delete(`/comments/${nonExistentId}`)
                .set('Authorization', `Bearer ${token_user2}`);

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('message'); // Adjust based on your actual response
            expect(Comment.findById).toHaveBeenCalledWith(nonExistentId);
        })
    })
})