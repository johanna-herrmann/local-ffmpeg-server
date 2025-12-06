#!/env/node

import { readFileSync } from 'fs';
import { Command } from 'commander';
import { getApi } from './api.js';
import { initWebSocket } from './ws.js';

const { name, description, version } = JSON.parse(readFileSync('package.json', 'utf8'));

new Command()
  .name(name)
  .description(`${description}.\nMore Information: https://www.npmjs.com/package/local-ffmpeg-server`)
  .version(version)
  .argument('<origin>', 'Origin to allow for CORS')
  .argument('[port]', 'Port to start the server on', '3000')
  .action((origin, port) => {
    const api = getApi(origin);
    const server = api.listen(parseInt(port), () => {
      console.log(`Running on port ${port}, with ${origin} allowed for CORS.`);
    });
    initWebSocket(server);
  })
  .parse();
