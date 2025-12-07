import { WebSocketServer } from 'ws';

let client;

const initWebSocket = (server) => {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('WS client connected');
    client = ws;

    ws.on('close', () => {
      client = null;
      console.log('WS client disconnected');
    });

    ws.on('message', (msg) => {
      console.log('WS message:', msg.toString());
    });

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

export { initWebSocket, send };
