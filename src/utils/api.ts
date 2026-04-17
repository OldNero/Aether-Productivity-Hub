export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787/api';

export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Required for Lucia Auth session cookies to be sent
  });
  
  if (!response.ok) {
    let message = 'An error occurred';
    try {
      const errorData = await response.json();
      message = errorData.error || message;
    } catch (e) {}
    throw new Error(message);
  }
  
  return response.json();
};
