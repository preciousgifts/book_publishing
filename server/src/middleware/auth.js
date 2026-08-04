const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/responseHandler');

const authMiddleware = (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }
  
  if (!token) {
    return sendError(res, 'Unauthorized: Access token is missing or invalid', 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-dev-jwt-token-key-change-in-production');
    
    // Attach user profile info
    req.user = {
      id: decoded.userId,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    return sendError(res, 'Unauthorized: Invalid or expired token', 401);
  }
};

module.exports = authMiddleware;
