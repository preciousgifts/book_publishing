const request = require('supertest');
const app = require('../src/server');
const prisma = require('../src/config/db');
jest.setTimeout(30000);

let mockUserStore = null;
jest.mock('../src/config/db', () => {
  return {
    user: {
      findUnique: jest.fn().mockImplementation((args) => {
        const queryEmail = args.where.email?.toLowerCase();
        if (mockUserStore && queryEmail === mockUserStore.email) {
          return Promise.resolve(mockUserStore);
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation((args) => {
        mockUserStore = {
          id: 'mock-user-id',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        return Promise.resolve(mockUserStore);
      }),
      update: jest.fn().mockImplementation((args) => {
        if (mockUserStore) {
          mockUserStore = { ...mockUserStore, ...args.data };
          return Promise.resolve(mockUserStore);
        }
        return Promise.resolve(null);
      }),
      deleteMany: jest.fn().mockImplementation(() => {
        mockUserStore = null;
        return Promise.resolve({ count: 1 });
      })
    },
    $disconnect: jest.fn().mockResolvedValue()
  };
});

describe('Authentication recovery and lifecycle endpoints', () => {
  const testEmail = `test_user_jest_${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';
  const testFullName = 'Jest Test User';
  const testQuestion = 'In what city were you born?';
  const testAnswer = 'Springfield';

  afterAll(async () => {
    // Clean up test user
    try {
      await prisma.user.deleteMany({
        where: { email: testEmail }
      });
    } catch (e) {
      // Ignore
    }
    await prisma.$disconnect();
  });

  test('POST /api/auth/register with security questions', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        fullName: testFullName,
        securityQuestion: testQuestion,
        securityAnswer: testAnswer
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail);
    expect(res.body.data.token).toBeDefined();
  });

  test('POST /api/auth/login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  test('POST /api/auth/reset-password-init with correct email', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password-init')
      .send({
        email: testEmail
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.securityQuestion).toBe(testQuestion);
  });

  test('POST /api/auth/reset-password-confirm with incorrect answer', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password-confirm')
      .send({
        email: testEmail,
        securityAnswer: 'WrongAnswer',
        newPassword: 'NewSecurePassword123!'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Incorrect answer');
  });

  test('POST /api/auth/reset-password-confirm with correct answer resets password', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password-confirm')
      .send({
        email: testEmail,
        securityAnswer: testAnswer,
        newPassword: 'NewSecurePassword123!'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toContain('successfully updated');

    // Verify we can log in with new password
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'NewSecurePassword123!'
      });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.success).toBe(true);
  });
});
