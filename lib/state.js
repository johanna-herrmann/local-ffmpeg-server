import { send } from './ws.js';

const state = function (type, value) {
  send({ type, message: value + '' });
};

export { state };
