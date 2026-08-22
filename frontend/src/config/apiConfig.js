/**
 * API Configuration Module
 * Reads base URL from environment variables (VITE_BASE_URL)
 */

export const API_BASE_URL = (import.meta.env.VITE_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');

/**
 * Returns standard authentication headers for fetch requests
 */
export function getAuthHeaders(extraHeaders = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}
