// Mock TurboModuleRegistry so React Native loads in Jest without native binary
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => ({
  getEnforcing: (name) => ({
    getConstants: () =>
      name === 'DeviceInfo'
        ? {
            Dimensions: {
              window: { width: 750, height: 1334, scale: 2, fontScale: 2 },
              screen: { width: 750, height: 1334, scale: 2, fontScale: 2 },
            },
          }
        : {},
  }),
  get: () => null,
}));
// Mock geolocation (native module not available in Jest)
const mockSetRNConfiguration = jest.fn();
jest.mock('@react-native-community/geolocation', () => ({
  __esModule: true,
  default: {
    setRNConfiguration: mockSetRNConfiguration,
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(() => ({ remove: jest.fn() })),
    clearWatch: jest.fn(),
  },
}));
// Mock react-native-maps (ESM/native, not transformable in Jest)
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: View,
    Marker: View,
    Polyline: View,
    PROVIDER_GOOGLE: 'google',
  };
});

// Mock Platform (re-export) so navigation gets select
jest.mock('react-native/Libraries/Utilities/Platform', () => {
  const select = (spec) => (spec && (spec.ios ?? spec.native ?? spec.default)) || undefined;
  return {
    __esModule: true,
    default: {
      OS: 'ios',
      isTV: false,
      select,
      Version: 14,
      get constants() {
        return { osVersion: '14', interfaceIdiom: 'phone', isTesting: true };
      },
    },
  };
});
