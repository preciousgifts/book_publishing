require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const { paragraphRouter, progressRouter } = require('./routes/paragraphRoutes');
const { swarmRouter, exportRouter } = require('./routes/swarmRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - only allow frontend origin
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// HTTP Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[API] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Disable caching for all API endpoints to prevent stale states on navigation
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'PublishFlow AI Gateway API',
    status: 'online',
    health: '/api/health',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

const researchRoutes = require('./routes/researchRoutes');
const noteRoutes = require('./routes/noteRoutes');
const styleGuideRoutes = require('./routes/styleGuideRoutes');
const matterRoutes = require('./routes/matterRoutes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/matter', matterRoutes);
app.use('/api/paragraphs', paragraphRouter);
app.use('/api/progress', progressRouter);
app.use('/api/swarm', swarmRouter);
app.use('/api/export', exportRouter);
app.use('/api/research', researchRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/style-guide', styleGuideRoutes);

// Global Error Handler for json parsing / other errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

const prisma = require('./config/db');

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log('Testing database connection...');
    try {
      await prisma.$connect();
      console.log('✔ Database connection established successfully!');
    } catch (err) {
      console.error('❌ Database connection failed:', err.message);
      console.error('Please verify that the DATABASE_URL environment variable in server/.env is correct and reachable.');
    }
  });
}

module.exports = app;
