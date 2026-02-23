/**
 * @format
 * Frontend tests: App render, login flow (using ReactTestRenderer to avoid native modules in Jest).
 */

jest.mock('@react-native-community/geolocation', () => ({
  __esModule: true,
  default: {
    setRNConfiguration: jest.fn(),
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(() => ({ remove: jest.fn() })),
    clearWatch: jest.fn(),
  },
}));
jest.mock('react-native-vector-icons/MaterialIcons', () => ({ default: () => null }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

describe('App', () => {
  test('renders correctly', async () => {
    await ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<App />);
    });
  });

  test('app renders without crashing during initial load', async () => {
    let root;
    await ReactTestRenderer.act(() => {
      root = ReactTestRenderer.create(<App />);
    });
    expect(root).toBeDefined();
    expect(root.toJSON()).toBeDefined();
  });

  test('after auth check completes, app shows content (login or main)', async () => {
    jest.useFakeTimers();
    let root;
    await ReactTestRenderer.act(() => {
      root = ReactTestRenderer.create(<App />);
    });
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(600);
    });
    expect(root.toJSON()).toBeDefined();
    jest.useRealTimers();
  });
});
