const request = require('supertest');
const app = require('../src/server');
const prisma = require('../src/config/db');

jest.setTimeout(30000);

let mockUserStore = { id: 'ed51065b-474e-4270-a2a2-5f0ac42b02e8', email: 'test@example.com' };
let mockProjectStore = null;
let mockOutlineStore = null;
let mockParagraphsStore = [];

// Mock Prisma
jest.mock('../src/config/db', () => {
  return {
    user: {
      findUnique: jest.fn().mockImplementation((args) => {
        if (mockUserStore && args.where.id === mockUserStore.id) return Promise.resolve(mockUserStore);
        return Promise.resolve(null);
      })
    },
    project: {
      findFirst: jest.fn().mockImplementation((args) => {
        if (mockProjectStore && args.where.id === mockProjectStore.id) return Promise.resolve(mockProjectStore);
        return Promise.resolve(null);
      })
    },
    outline: {
      findFirst: jest.fn().mockImplementation((args) => {
        if (mockOutlineStore && args.where.projectId === mockOutlineStore.projectId) return Promise.resolve(mockOutlineStore);
        return Promise.resolve(null);
      }),
      update: jest.fn().mockImplementation((args) => {
        if (mockOutlineStore && args.where.id === mockOutlineStore.id) {
          mockOutlineStore = { ...mockOutlineStore, ...args.data };
          return Promise.resolve(mockOutlineStore);
        }
        return Promise.resolve(null);
      })
    },
    paragraph: {
      createMany: jest.fn().mockImplementation((args) => {
        mockParagraphsStore = args.data;
        return Promise.resolve({ count: args.data.length });
      })
    },
    $transaction: jest.fn().mockImplementation((callback) => {
      // Return execution of callback with transaction mock object
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
        outline: {
          create: jest.fn().mockImplementation((args) => {
            mockOutlineStore = {
              id: '10e976db-19b0-4f9e-a8eb-9cf0656a73c1',
              ...args.data
            };
            return Promise.resolve(mockOutlineStore);
          })
        },
        paragraph: {
          createMany: jest.fn().mockImplementation((args) => {
            mockParagraphsStore = args.data;
            return Promise.resolve({ count: args.data.length });
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

// Mock pythonWorkerClient
jest.mock('../src/utils/pythonWorkerClient', () => ({
  post: jest.fn().mockImplementation((url, data) => {
    if (url.includes('/internal/swarm/adjust-outline')) {
      return Promise.resolve({
        data: {
          success: true,
          tocData: [
            { chapterNumber: 1, title: 'Adjusted Chapter 1', summary: 'Restructured summary' }
          ]
        }
      });
    }
    return Promise.reject(new Error('Unknown mock URL'));
  })
}));

// Mock axios directly since manuscriptController uploads files via native axios
jest.mock('axios', () => ({
  post: jest.fn().mockImplementation((url, data) => {
    if (url.includes('/internal/manuscript/parse')) {
      return Promise.resolve({
        data: {
          toc: [
            { chapterNumber: 1, title: 'Parsed Chapter 1', summary: 'Parsed summary' }
          ],
          healthReport: '### Health Report\n- Readability is good.',
          paragraphs: [
            { chapterIndex: 1, paragraphIndex: 1, rawContent: 'Hello parsed paragraph.' }
          ]
        }
      });
    }
    return Promise.reject(new Error('Unknown mock URL'));
  })
}));

describe('Manuscript Upload & Outline Adjustments Gateway Endpoints', () => {
  let jwtToken = '';

  beforeAll(async () => {
    // Generate valid mock JWT token
    const jwt = require('jsonwebtoken');
    jwtToken = jwt.sign(
      { userId: mockUserStore.id, email: mockUserStore.email },
      process.env.JWT_SECRET || 'super-secret-dev-jwt-token-key-change-in-production'
    );
  });

  test('POST /api/projects/upload-manuscript parses file and commits to DB', async () => {
    const res = await request(app)
      .post('/api/projects/upload-manuscript')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', Buffer.from('mock text file contents'), 'manuscript.txt')
      .field('title', 'My Manuscript Project')
      .field('genre', 'non-fiction')
      .field('languageLocale', 'en-US')
      .field('trimSize', '6x9');

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.projectId).toBe('3f8b9d3b-0bb5-4f35-86ff-94b12d5df835');
    expect(res.body.data.healthReport).toContain('Readability is good');
    expect(mockProjectStore.title).toBe('My Manuscript Project');
    expect(mockOutlineStore.tocData.length).toBe(1);
    expect(mockParagraphsStore.length).toBe(1);
  });

  test('POST /api/swarm/adjust-outline adjusts structure via python worker proxy', async () => {
    const res = await request(app)
      .post('/api/swarm/adjust-outline')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        projectId: '3f8b9d3b-0bb5-4f35-86ff-94b12d5df835',
        action: 'expand',
        targetChapterCount: 2,
        feedback: 'Add some details'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tocData[0].title).toBe('Adjusted Chapter 1');
  });
});
