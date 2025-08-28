// Client environment configuration
const config = {
  // API endpoint
  apiUrl: process.env.REACT_APP_API_URL,
  
  // MinIO endpoint
  minioUrl: process.env.REACT_APP_MINIO_URL,
  
  // WebSocket endpoint
  wsUrl: process.env.REACT_APP_WEBSOCKET_URL,
  
  // Get API headers with authorization
  getHeaders: () => ({
    Authorization: `Bearer ${localStorage.getItem('jwt')}`,
  }),
  
  // Get full API URL for a path
  getApiUrl: (path) => {
    if (!config.apiUrl) {
      throw new Error('API URL not configured. Check REACT_APP_API_URL in .env');
    }
    return `${config.apiUrl}${path}`;
  },
  
  // Get full MinIO URL for a path
  getMinioUrl: (path) => {
    if (!config.minioUrl) {
      throw new Error('MinIO URL not configured. Check REACT_APP_MINIO_URL in .env');
    }
    return `${config.minioUrl}${path}`;
  },
  
  // Get full WebSocket URL
  getWsUrl: () => {
    if (!config.wsUrl) {
      throw new Error('WebSocket URL not configured. Check REACT_APP_WEBSOCKET_URL in .env');
    }
    return config.wsUrl;
  }
};

export default config;
