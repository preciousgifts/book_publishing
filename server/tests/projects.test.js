const request = require('supertest');
const app = require('../src/server');
const prisma = require('../src/config/db');

jest.setTimeout(30000);

let mockUserStore = null;
let mockProjectStore = null;
let mockOutlineStore = null;

const MOCK_USER_ID = 'ed51065b-474e-4270-a2a2-5f0ac42b02e8';
const MOCK_PROJECT_ID = '3f8b9d3b-0bb5-4f35-86ff-94b12d5df835';
const MOCK_OUTLINE_ID = '10e976db-19b0-4f9e-a8eb-9cf0656a73c1';

jest.mock('../src/config/db', () => {
  return {
    user: {
      findUnique: jest.fn().mockImplementation((args) => {
        const queryEmail = args.where.email?.toLowerCase();
        if (mockUserStore && (queryEmail === mockUserStore.email || args.where.id === mockUserStore.id)) {
          return Promise.resolve(mockUserStore);
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation((args) => {
        mockUserStore = {
          id: 'ed51065b-474e-4270-a2a2-5f0ac42b02e8',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        return Promise.resolve(mockUserStore);
      }),
      deleteMany: jest.fn().mockImplementation(() => {
        mockUserStore = null;
        mockProjectStore = null;
        mockOutlineStore = null;
        return Promise.resolve({ count: 1 });
      })
    },
    project: {
      create: jest.fn().mockImplementation((args) => {
        mockProjectStore = {
          id: '3f8b9d3b-0bb5-4f35-86ff-94b12d5df835',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        return Promise.resolve(mockProjectStore);
      }),
      findMany: jest.fn().mockImplementation(() => {
        return Promise.resolve(mockProjectStore ? [mockProjectStore] : []);
      }),
      findUnique: jest.fn().mockImplementation((args) => {
        if (mockProjectStore && args.where.id === mockProjectStore.id) {
          return Promise.resolve(mockProjectStore);
        }
        return Promise.resolve(null);
      }),
      findFirst: jest.fn().mockImplementation((args) => {
        if (mockProjectStore && args.where.id === mockProjectStore.id) {
          return Promise.resolve(mockProjectStore);
        }
        return Promise.resolve(null);
      }),
      delete: jest.fn().mockImplementation(() => {
        const deleted = mockProjectStore;
        mockProjectStore = null;
        return Promise.resolve(deleted || { id: '3f8b9d3b-0bb5-4f35-86ff-94b12d5df835' });
      })
    },
    outline: {
      findFirst: jest.fn().mockImplementation(() => {
        return Promise.resolve(mockOutlineStore);
      }),
      create: jest.fn().mockImplementation((args) => {
        mockOutlineStore = {
          id: '10e976db-19b0-4f9e-a8eb-9cf0656a73c1',
          ...args.data
        };
        return Promise.resolve(mockOutlineStore);
      })
    },
    userProgress: {
      create: jest.fn().mockResolvedValue({})
    },
    $transaction: jest.fn().mockImplementation((callback) => {
      return callback({
        project: {
          create: jest.fn().mockImplementation((args) => {
            mockProjectStore = {
              id: '3f8b9d3b-0bb5-4f35-86ff-94b12d5df835',
              ...args.data,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            return Promise.resolve(mockProjectStore);
          })
        },
        userProgress: {
          create: jest.fn().mockResolvedValue({})
        }
      });
    }),
    $disconnect: jest.fn().mockResolvedValue()
  };
});

// Mock python worker client to avoid real HTTP requests during testing
jest.mock('../src/utils/pythonWorkerClient', () => ({
  post: jest.fn().mockImplementation((url, data) => {
    if (url.includes('/internal/swarm/outline')) {
      return Promise.resolve({
        data: {
          success: true,
          data: {
            toc: [
              { chapterNumber: 1, title: 'Mock Chapter 1', summary: 'Mock Summary 1' }
            ],
            discoveryQuestions: ['Q1', 'Q2']
          }
        }
      });
    }
    if (url.includes('/internal/swarm/write-chapter')) {
      return Promise.resolve({
        data: {
          success: true,
          data: [
            { rawContent: 'Drafted paragraph 1', formattedHtml: '<p>Drafted paragraph 1</p>' }
          ]
        }
      });
    }
    return Promise.reject(new Error('Unknown mock URL'));
  }),
  get: jest.fn().mockImplementation((url, data) => {
    if (url.includes('/internal/export/docx') || url.includes('/internal/export/pdf')) {
      return Promise.resolve({
        data: Buffer.from('Mock file buffer'),
        headers: { 'content-type': 'application/octet-stream' }
      });
    }
    return Promise.reject(new Error('Unknown mock URL'));
  })
}));

describe('Project CRUD & Swarm Proxy API tests', () => {
  const testEmail = `test_user_proj_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  let jwtToken = '';
  let projectId = '';

  beforeAll(async () => {
    // Create test user and obtain token
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        fullName: 'Project Tester'
      });
    jwtToken = res.body.data.token;
  });

  afterAll(async () => {
    // Cleanup
    try {
      await prisma.user.deleteMany({
        where: { email: testEmail }
      });
    } catch (e) {
      // Ignore
    }
    await prisma.$disconnect();
  });

  test('POST /api/projects - create project', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        title: 'Project Jest test book',
        genre: 'non-fiction',
        trimSize: '6x9',
        languageLocale: 'en-US'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    projectId = res.body.data.id;
  });

  test('GET /api/projects - list user projects', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${jwtToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('GET /api/projects/:id - retrieve project details', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${jwtToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Project Jest test book');
  });

  test('POST /api/swarm/generate-outline - proxy swarm outline', async () => {
    const res = await request(app)
      .post('/api/swarm/generate-outline')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        projectId,
        prompt: 'A science book',
        genre: 'non-fiction'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tocData).toBeDefined();
  });

  test('DELETE /api/projects/:id - remove project', async () => {
    const res = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${jwtToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify it is deleted
    const checkRes = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(checkRes.statusCode).toBe(404);
  });
});
