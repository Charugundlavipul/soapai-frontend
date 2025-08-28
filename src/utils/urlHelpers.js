import config from '../config/config';

// Get the base URL for MinIO based on environment
export const getMinioBaseUrl = () => {
  return config.minioUrl;
};

// Get the API base URL based on environment
export const getApiBaseUrl = () => {
  return config.apiUrl;
};

// Generate a MinIO URL with the correct base URL
export const getMinioUrl = (bucketName, objectName) => {
  return config.getMinioUrl(`${bucketName}/${objectName}`);
};

// Get WebSocket URL based on environment
export const getWebsocketUrl = () => {
  return config.getWsUrl();
};
