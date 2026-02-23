/**
 * API base URL for the backend.
 * - Android emulator: use 10.0.2.2 to reach your Mac's localhost
 * - iOS simulator: use 127.0.0.1 (localhost)
 * - Physical device: set API_BASE_URL in this file to your Mac's IP, e.g. http://192.168.1.5:3000/api
 */
import { Platform } from 'react-native';

const PORT = 3000;

// Override this to your Mac's IP when using a physical device (e.g. '192.168.1.5')
const DEV_HOST_OVERRIDE = null;

const getDevBaseUrl = () => {
  if (DEV_HOST_OVERRIDE) {
    return `http://${DEV_HOST_OVERRIDE}:${PORT}/api`;
  }
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${PORT}/api`;
  }
  return `http://127.0.0.1:${PORT}/api`;
};

export const API_BASE_URL = __DEV__
  ? getDevBaseUrl()
  : 'https://hos-8cby.onrender.com/api';
