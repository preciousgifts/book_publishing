const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('../config/db');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-dev-jwt-token-key-change-in-production';
const TOKEN_EXPIRY = '7d';

// Input schemas validation using Zod
const registerSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
  fullName: z.string().min(1, { message: 'Full name is required' }).optional().nullable(),
  securityQuestion: z.string().optional().nullable(),
  securityAnswer: z.string().optional().nullable()
});

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' })
});

const resetInitSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' })
});

const resetConfirmSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  securityAnswer: z.string().min(1, { message: 'Security answer is required' }),
  newPassword: z.string().min(6, { message: 'New password must be at least 6 characters long' })
});

/**
 * Helper to generate JWT Token for a user.
 */
const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
};

/**
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map(err => err.message).join(', ');
      return sendError(res, errorMsg, 400);
    }

    const { email, password, fullName, securityQuestion, securityAnswer } = parseResult.data;

    // Check duplicate emails
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return sendError(res, 'Email already registered', 400);
    }

    // Hash password with bcryptjs
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Hash security answer if provided
    let securityAnswerHash = null;
    if (securityAnswer) {
      securityAnswerHash = await bcrypt.hash(securityAnswer, salt);
    }

    // Create user in Database
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        fullName,
        securityQuestion,
        securityAnswerHash
      }
    });

    // Issue JWT Token
    const token = generateToken(user);

    return sendSuccess(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName
      }
    }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return sendError(res, 'Internal server error during registration', 500);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map(err => err.message).join(', ');
      return sendError(res, errorMsg, 400);
    }

    const { email, password } = parseResult.data;

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return sendError(res, 'Invalid email or password', 401);
    }

    // Compare bcrypt hashes
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return sendError(res, 'Invalid email or password', 401);
    }

    // Issue JWT Token
    const token = generateToken(user);

    return sendSuccess(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName
      }
    }, 200);
  } catch (error) {
    console.error('Login error:', error);
    return sendError(res, 'Internal server error during login', 500);
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    // req.user has { id, email } attached by authMiddleware.
    // Fetch full profile from database.
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }, 200);
  } catch (error) {
    console.error('Get me error:', error);
    return sendError(res, 'Internal server error fetching user profile', 500);
  }
};

/**
 * POST /api/auth/reset-password-init
 */
const resetPasswordInit = async (req, res) => {
  try {
    const parseResult = resetInitSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map(err => err.message).join(', ');
      return sendError(res, errorMsg, 400);
    }

    const { email } = parseResult.data;
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return sendError(res, 'User with this email does not exist', 404);
    }

    if (!user.securityQuestion) {
      return sendError(res, 'This account does not have a registered security question', 400);
    }

    return sendSuccess(res, {
      securityQuestion: user.securityQuestion
    }, 200);
  } catch (error) {
    console.error('Reset password init error:', error);
    return sendError(res, 'Internal server error during recovery initiation', 500);
  }
};

/**
 * POST /api/auth/reset-password-confirm
 */
const resetPasswordConfirm = async (req, res) => {
  try {
    const parseResult = resetConfirmSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map(err => err.message).join(', ');
      return sendError(res, errorMsg, 400);
    }

    const { email, securityAnswer, newPassword } = parseResult.data;
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return sendError(res, 'User with this email does not exist', 404);
    }

    if (!user.securityAnswerHash) {
      return sendError(res, 'This account does not have a registered security answer', 400);
    }

    // Verify security answer hash
    const isAnswerMatch = await bcrypt.compare(securityAnswer, user.securityAnswerHash);
    if (!isAnswerMatch) {
      return sendError(res, 'Incorrect answer to security question', 400);
    }

    // Hash new password and update in database
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    return sendSuccess(res, { message: 'Password has been successfully updated' }, 200);
  } catch (error) {
    console.error('Reset password confirm error:', error);
    return sendError(res, 'Internal server error during password reset confirmation', 500);
  }
};

module.exports = {
  register,
  login,
  getMe,
  resetPasswordInit,
  resetPasswordConfirm
};
