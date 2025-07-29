import config from '../config';

// Format file size for display
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Validate file before upload
export const validateFile = (file) => {
  if (!file) {
    throw new Error('No file selected');
  }

  if (!config.UPLOAD.ALLOWED_TYPES.includes(file.type)) {
    throw new Error(config.ERRORS.INVALID_FILE_TYPE);
  }

  if (file.size > config.UPLOAD.MAX_FILE_SIZE) {
    throw new Error(config.ERRORS.FILE_TOO_LARGE);
  }

  return true;
};

// Analyze image using the API
export const analyzeImage = async (file) => {
  try {
    // Validate file first
    validateFile(file);

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // Make API request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.UI.LOADING_TIMEOUT);

    const response = await fetch(`${config.API_BASE_URL}${config.ENDPOINTS.ANALYZE}`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('API endpoint not found. Please check the configuration.');
      } else if (response.status >= 500) {
        throw new Error(config.ERRORS.BACKEND_ERROR);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    const data = await response.json();

    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format from server');
    }

    // Check for specific error messages in response
    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(config.ERRORS.NETWORK_ERROR);
    } else {
      throw error;
    }
  }
};

// Health check for API
export const checkApiHealth = async () => {
  try {
    const response = await fetch(`${config.API_BASE_URL}${config.ENDPOINTS.HEALTH}`, {
      method: 'GET',
      timeout: 5000,
    });
    return response.ok;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}; 