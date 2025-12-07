import { WebSocketServer } from 'ws';

let client;

const initWebSocket = (server) => {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    client = ws;

    ws.on('close', () => {
      client = null;
    });

    ws.on('message', () => {});

    ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));
  });
};

const send = (payload) => {
  if (!client) {
    return;
  }
  const message = JSON.stringify(payload);
  client.send(message);
};

const isConnected = function () {
  return !!client?.send;
};

export { initWebSocket, send, isConnected };
