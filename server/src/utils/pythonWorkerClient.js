const axios = require('axios');

const pythonWorkerClient = axios.create({
  baseURL: process.env.PYTHON_WORKER_URL || 'http://localhost:8000',
  timeout: 120000, // 120 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to handle errors systematically
pythonWorkerClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let errorMessage = 'An error occurred while communicating with the Python AI worker.';
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request to Python AI worker timed out (exceeded 2-minute limit).';
    } else if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const data = error.response.data;
      errorMessage = (data && (data.error || data.detail || data.message)) || `Python AI worker error (${error.response.status})`;
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response received from the Python AI worker. Ensure the service is running.';
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage = error.message;
    }
    
    const customError = new Error(errorMessage);
    customError.statusCode = (error.response && error.response.status) || 502;
    customError.originalError = error;
    
    return Promise.reject(customError);
  }
);

module.exports = pythonWorkerClient;
