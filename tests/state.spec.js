import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';

let lastPayload, stateFn;

describe('state', () => {
  beforeAll(async () => {
    jest.unstable_mockModule('../lib/ws.js', () => {
      return {
        send(payload) {
          lastPayload = payload;
        }
      };
    });

    const { state } = await import('../lib/state.js');
    stateFn = state;
  });

  beforeEach(() => {
    lastPayload = {};
  });

  test('calls ws send correctly', async () => {
    stateFn('progress', 42);

    expect(lastPayload).toEqual({ type: 'progress', message: '42' });
  });
});
