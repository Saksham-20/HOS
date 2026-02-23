module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: [],
  testMatch: ['**/__tests__/**/*.test.(tsx|ts|js)'],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-navigation|@testing-library)/)',
  ],
};
