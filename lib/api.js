import { readdir, unlink } from 'fs/promises';
import path from 'path';
import express from 'express';
import cors from 'cors';
import upload from 'express-fileupload';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { commands } from './commands.js';

const getApi = function () {
  const app = express();

  // registered before cors middleware to provide api doku only for same-origin requests
  const swaggerDocument = YAML.load(path.join(process.cwd(), 'docs', 'openapi.yaml'));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  app.use(express.json());
  app.use(cors());
  app.use(upload({ useTempFiles: true, tempFileDir: './files' }));

  app.post('/upload', async (req, res) => {
    let field;
    if (req.files) {
      const keys = Object.keys(req.files);
      field = keys[0];
    }
    if (!field) {
      return res.status(400).send('No file uploaded');
    }
    const file = req.files[field];
    await file.mv(`./files/${path.basename(file.name)}`);
    res.send('uploaded');
  });

  app.post('/command/:commandName', async (req, res) => {
    const commandName = req.params.commandName;
    if (!(commandName in commands)) {
      return res.status(404).send(`command not found: ${commandName}`);
    }
    req.body.input = `./files/${path.basename(req.body.input ?? 'file')}`;
    const filesBefore = new Set(await readdir('./files'));
    await commands[commandName](req.body);
    const filesAfter = new Set(await readdir('./files'));
    const filesCreated = [...filesAfter].filter((file) => !filesBefore.has(file));
    res.status(200).json(filesCreated);
  });

  app.get('/download/:filename', async (req, res) => {
    const filename = path.basename(req.params.filename);
    const files = await readdir('./files');
    if (!files.includes(filename)) {
      return res.status(404).send(`No such file: ${filename}`);
    }
    res.download(`./files/${filename}`);
  });

  app.delete('/remove-files', async (req, res, next) => {
    const folder = path.resolve('./files');
    const entries = await readdir(folder, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile()).map((entry) => unlink(path.join(folder, entry.name)));
    await Promise.all(files);
    res.status(200).send(`${files.length} files deleted`);
  });

  app.use((req, res) => {
    const { method, path } = req;
    res.status(404).send({ error: 'endpoint not found or invalid request method', method, path });
  });

  app.use((error, req, res, next) => {
    console.error(error);
    if (res.headersSent) {
      return;
    }
    res.status(500).send(`Error: ${error?.message ?? 'unknown error'}`);
  });

  return app;
};

export { getApi };
