import { Platform } from 'react-native';

// Get the API URL based on the environment
const getApiUrl = () => {
  if (__DEV__) {
    // For development in Expo Go:
    // 1. If running in Expo Go on a physical device, use your computer's local IP address
    // Example: return 'http://192.168.1.100:5000';

    // 2. If running in web browser or simulator, use localhost
    // You can uncomment the IP address line and replace with your computer's IP
    // return 'http://192.168.1.100:5000';

    return 'http://localhost:5000';
  }
  // For production, use your deployed server URL
  return 'https://your-production-url.com';
};

export const API_URL = getApiUrl();

// Helper function to determine if we're running in Expo Go on a physical device
export const isExpoGoPhysicalDevice = () => {
  return (
    __DEV__ && 
    Platform.OS !== 'web' && 
    Platform.select({ 
      ios: !process.env.SIMULATOR_UDID, 
      android: !process.env.IS_ANDROID_EMULATOR,
      default: false 
    })
  );
};