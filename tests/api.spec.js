import path from 'path';
import { fileURLToPath } from 'url';
import { mkdir, readdir, writeFile, unlink } from 'fs/promises';
import request from 'supertest';
import { jest, describe, test, expect, beforeAll, beforeEach, afterEach, afterAll } from '@jest/globals';

let app, getApi, commands, consoleSpy;
const fileDir = './files';
const origin = 'http://localhost:1234';

const __filename = fileURLToPath(import.meta.url);

const clearFileDir = async function () {
  const files = await readdir(fileDir);
  for (const file of files) {
    await unlink(path.join(fileDir, file));
  }
};

describe('API', () => {
  beforeAll(async () => {
    jest.unstable_mockModule('../lib/commands.js', () => ({
      commands: {
        convert: jest.fn(async ({ input }) => {
          if (input?.endsWith('video.mp4')) {
            await writeFile(path.join(fileDir, 'video.avi'), '');
          }
        })
      }
    }));

    jest.unstable_mockModule('yamljs', () => ({
      default: {
        load: jest.fn(() => ({}))
      }
    }));

    ({ getApi } = await import('../lib/api.js'));
    ({ commands } = await import('../lib/commands.js'));

    await mkdir(fileDir, { recursive: true });
  });

  beforeEach(() => {
    app = getApi(origin);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy?.mockRestore();
  });

  afterAll(async () => {
    await clearFileDir();
  });

  describe('CORS', () => {
    test('Sets correct origin header for api request.', async () => {
      const res = await request(app).post('/upload');

      expect(res.headers['access-control-allow-origin']).toEqual(origin);
    });

    test('Sets no origin header for docs request.', async () => {
      const res = await request(app).post('/docs');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('POST /upload', () => {
    test('rejects missing file.', async () => {
      const res = await request(app).post('/upload');

      expect(res.status).toBe(400);
      expect(res.text).toBe('No file uploaded');
    });

    test('does upload.', async () => {
      const res = await request(app).post('/upload').attach('file', __filename);

      expect(res.status).toBe(200);
      expect(res.text).toBe('uploaded');
      expect((await readdir(fileDir)).includes(path.basename(__filename))).toBe(true);
    });
  });

  describe('POST /command/:commandName', () => {
    test('returns 404 for unknown command.', async () => {
      const res = await request(app).post('/command/unknown').send({ input: 'video.mp4' });

      expect(res.status).toBe(404);
      expect(res.text).toEqual('command not found: unknown');
    });

    test('executes command and returns created files.', async () => {
      await clearFileDir();

      const res = await request(app).post('/command/convert').send({ input: 'video.mp4', format: 'avi' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(['video.avi']);
      expect(commands.convert).toHaveBeenCalledTimes(1);
      expect(commands.convert).toBeCalledWith({ input: './files/video.mp4', format: 'avi' });
    });
  });

  describe('GET /download/:filename', () => {
    test('returns 404 if file does not exist.', async () => {
      const res = await request(app).get('/download/notfound.mp4');

      expect(res.status).toBe(404);
    });

    test('returns requested file.', async () => {
      await writeFile(path.join(fileDir, 'fileToDownload.ts'), '');

      const res = await request(app).get('/download/fileToDownload.ts');

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toEqual('attachment; filename="fileToDownload.ts"');
      expect(res.body).toBeDefined();
    });
  });

  describe('DELETE /remove-files', () => {
    test('deletes all files.', async () => {
      await writeFile(path.join(fileDir, 'fileOne'), '');
      await writeFile(path.join(fileDir, 'fileTwo'), '');
      const files = (await readdir(fileDir)).length;

      const res = await request(app).delete('/remove-files');

      expect(res.status).toBe(200);
      expect(res.text).toEqual(`${files} files deleted`);
    });
  });

  describe('Fallbacks', () => {
    test('returns JSON 404 for unknown route.', async () => {
      const res = await request(app).get('/does-not-exist');

      expect(res.status).toBe(404);
      expect(res.body.error).toEqual('endpoint not found or invalid request method');
      expect(res.body.method).toEqual('GET');
      expect(res.body.path).toEqual('/does-not-exist');
    });

    test('returns 500 json on internal server error.', async () => {
      let loggedMessage;
      consoleSpy = jest.spyOn(console, 'error').mockImplementation((message) => {
        loggedMessage = message;
      });
      commands.convert.mockRejectedValueOnce(new Error('test error message'));
      const res = await request(app).post('/command/convert').send({});

      expect(res.status).toBe(500);
      expect(res.text).toEqual('Error: test error message');
      expect(loggedMessage?.toString()).toEqual('Error: test error message');
    });
  });
});
