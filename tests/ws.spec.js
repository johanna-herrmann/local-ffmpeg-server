import { jest, describe, test, beforeEach, expect, beforeAll } from '@jest/globals';

let mockConnectionCallback;
let wsSendMock;
let wsOnMocks;

beforeEach(() => {
  mockConnectionCallback = null;
  wsSendMock = jest.fn();
  wsOnMocks = {};
});

jest.unstable_mockModule('ws', () => ({
  WebSocketServer: class {
    constructor({ server }) {
      server.on?.('dummy', () => {});
    }
    // noinspection JSUnusedGlobalSymbols used mocky
    on(event, cb) {
      if (event === 'connection') {
        mockConnectionCallback = cb;
      }
    }
  }
}));

describe('WebSocket Module', () => {
  beforeAll(async () => {
    ({ initWebSocket: initWSModule, send: sendWS, isConnected: isWSConnected } = await import('../lib/ws.js'));
  });

  test('should call connection callback and send greeting', () => {
    const fakeServer = { on: jest.fn() };
    initWSModule(fakeServer);
    const fakeClient = {
      send: wsSendMock,
      on: jest.fn()
    };

    mockConnectionCallback(fakeClient);

    expect(wsSendMock).toHaveBeenCalledWith(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));
    expect(isWSConnected()).toBe(true);
  });

  test('should handle client close', () => {
    const fakeServer = { on: jest.fn() };
    initWSModule(fakeServer);
    const fakeClient = {
      send: wsSendMock,
      on: (event, cb) => {
        wsOnMocks[event] = cb;
      }
    };
    mockConnectionCallback(fakeClient);

    wsOnMocks['close']();

    expect(isWSConnected()).toBe(false);
  });

  test('send() should not send if no client connected', () => {
    sendWS({ type: 'test', message: 'hello' });

    expect(wsSendMock).not.toHaveBeenCalled();
  });

  test('send() should send payload if client connected', () => {
    const fakeServer = { on: jest.fn() };
    initWSModule(fakeServer);
    const fakeClient = {
      send: wsSendMock,
      on: jest.fn()
    };
    mockConnectionCallback(fakeClient);

    sendWS({ type: 'update', value: 42 });

    expect(wsSendMock).toHaveBeenCalledWith(JSON.stringify({ type: 'update', value: 42 }));
  });
});
