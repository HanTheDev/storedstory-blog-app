const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // assuming User model is in this path
const app = require('../server'); // assuming your Express app is exported here
const mongoose = require('mongoose');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('User API Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks(); // Clear all previous mocks
    });

    describe('POST /users/register', () => {
        it('should successfully register a new user', async () => {
            // Mock User.findOne to return null (no user with that email exists)
            User.findOne = jest.fn().mockResolvedValue(null);

            // Mock bcrypt.genSalt to return a salt value
            const mockSalt = 'randomSalt';
            bcrypt.genSalt = jest.fn().mockResolvedValue(mockSalt);

            // Mock bcrypt.hash to hash the password with the salt
            bcrypt.hash = jest.fn().mockResolvedValue('hashedpassword');

            // Mock JWT sign function
            jwt.sign = jest.fn().mockReturnValue('fakeToken');

            // Mock User.save to simulate saving the user to the database
            User.prototype.save = jest.fn().mockResolvedValue({
                _id: 'newUserId',
                username: 'testuser',
                email: 'test@test.com',
            });

            const res = await request(app)
                .post('/users/register')
                .send({ username: 'testuser', email: 'test@test.com', password: 'password123' });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('token', 'fakeToken');
            expect(User.findOne).toHaveBeenCalledWith({ email: 'test@test.com' });
            expect(bcrypt.genSalt).toHaveBeenCalledWith(10); // Ensure the salt generation is called with 10 rounds
            expect(bcrypt.hash).toHaveBeenCalledWith('password123', mockSalt); // Hashing should use the salt
            expect(User.prototype.save).toHaveBeenCalled(); // Ensure the save method is called
        });

        it('should return 400 if user already exists', async () => {
            // Mock User.findOne to return a user (user with that email exists)
            User.findOne = jest.fn().mockResolvedValue({ email: 'test@test.com' });

            const res = await request(app)
                .post('/users/register')
                .send({ username: 'testuser', email: 'test@test.com', password: 'password123' });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('message', 'User already exists');
        });

        it('should return 400 for validation errors', async () => {
            const res = await request(app)
                .post('/users/register')
                .send({ username: '', email: 'invalidemail', password: 'short' });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('errors');
            expect(res.body.errors.length).toBeGreaterThan(0); // Expect validation errors
        });
    });

    describe('POST /users/login', () => {
        it('should log in the user with correct credentials', async () => {
            // Mock User.findOne to return a user
            User.findOne = jest.fn().mockResolvedValue({
                _id: 'someUserId',
                email: 'test@test.com',
                password: 'hashedpassword',
            });

            // Mock bcrypt.compare to return true (passwords match)
            bcrypt.compare = jest.fn().mockResolvedValue(true);

            // Mock JWT sign function
            jwt.sign = jest.fn().mockReturnValue('fakeToken');

            const res = await request(app)
                .post('/users/login')
                .send({ email: 'test@test.com', password: 'password123' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token', 'fakeToken');
            expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
        });

        it('should return 400 for invalid credentials', async () => {
            // Mock User.findOne to return a user
            User.findOne = jest.fn().mockResolvedValue({
                _id: 'someUserId',
                email: 'test@test.com',
                password: 'hashedpassword',
            });

            // Mock bcrypt.compare to return false (passwords don't match)
            bcrypt.compare = jest.fn().mockResolvedValue(false);

            const res = await request(app)
                .post('/users/login')
                .send({ email: 'test@test.com', password: 'wrongpassword' });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('message', 'Invalid credentials');
        });

        it('should return 400 for validation errors', async () => {
            const res = await request(app)
                .post('/users/login')
                .send({ email: '', password: 'short' });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('errors');
            expect(res.body.errors.length).toBeGreaterThan(0);
        });
    });
});