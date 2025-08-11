const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const { connectDB } = require('../config/database');
const { STATUS_CODES, ROLES } = require('../constants');
const { getMessage } = require('../messages');

describe('Authentication Endpoints', () => {
  let testUser;
  let adminUser;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // await User.deleteMany({});

    testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: ROLES.EMPLOYEE
    });
    await testUser.save();

    adminUser = new User({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      role: ROLES.ADMIN
    });
    await adminUser.save();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        role: ROLES.EMPLOYEE
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(STATUS_CODES.CREATED);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(getMessage('AUTH.REGISTER_SUCCESS'));
      expect(response.body.data.user.name).toBe(userData.name);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.role).toBe(userData.role);
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should return error for duplicate email', async () => {
      const userData = {
        name: 'Duplicate User',
        email: 'test@example.com',
        password: 'password123',
        role: ROLES.EMPLOYEE
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(STATUS_CODES.CONFLICT);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe(getMessage('AUTH.EMAIL_EXISTS'));
    });

    it('should forbid creating admin via registration', async () => {
      const userData = {
        name: 'Illegal Admin',
        email: 'illegaladmin@example.com',
        password: 'password123',
        role: ROLES.ADMIN
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(STATUS_CODES.FORBIDDEN);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toMatch(/Admin users cannot be created/);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(STATUS_CODES.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(getMessage('AUTH.LOGIN_SUCCESS'));
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should return error for invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(STATUS_CODES.UNAUTHORIZED);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe(getMessage('AUTH.INVALID_CREDENTIALS'));
    });
  });

});

