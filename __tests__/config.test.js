/**
 * Frontend utility/config test (minimal).
 */
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

const { API_BASE_URL } = require('../src/config/api');

describe('config/api', () => {
  test('API_BASE_URL is a non-empty string', () => {
    expect(typeof API_BASE_URL).toBe('string');
    expect(API_BASE_URL.length).toBeGreaterThan(0);
    expect(API_BASE_URL).toMatch(/^https?:\/\//);
  });
});
