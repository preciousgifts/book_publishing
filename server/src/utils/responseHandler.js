/**
 * Standardized success response helper.
 * @param {object} res Express response object
 * @param {any} data Response data payload
 * @param {number} statusCode HTTP status code (default: 200)
 */
const sendSuccess = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data
  });
};

/**
 * Standardized error response helper.
 * @param {object} res Express response object
 * @param {string} message Error message
 * @param {number} statusCode HTTP status code (default: 400)
 */
const sendError = (res, message, statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    error: message
  });
};

module.exports = {
  sendSuccess,
  sendError
};
