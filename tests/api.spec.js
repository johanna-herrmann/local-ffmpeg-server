import path from 'path';
import { fileURLToPath } from 'url';
import { mkdir, readdir, writeFile, unlink } from 'fs/promises';
import request from 'supertest';
import { jest, describe, test, expect, beforeAll, beforeEach, afterEach, afterAll } from '@jest/globals';

let app, getApi, commands;
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
  let consoleLogSpy;
  let consoleErrorSpy;

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
    consoleLogSpy?.mockRestore();
    consoleErrorSpy?.mockRestore();
  });

  afterAll(async () => {
    await clearFileDir();
  });

  describe('CORS', () => {
    test('Sets correct origin header for api request.', async () => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const res = await request(app).delete('/remove-files');

      expect(res.headers['access-control-allow-origin']).toEqual(origin);
    });

    test('Sets no origin header for docs request.', async () => {
      const res = await request(app).post('/docs');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('POST /upload', () => {
    test('rejects missing file.', async () => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app).post('/upload');

      expect(res.status).toBe(400);
      expect(res.text).toBe('No file uploaded');
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Upload rejected, no file uploaded');
    });

    test('does upload.', async () => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const res = await request(app).post('/upload').attach('file', __filename);

      expect(res.status).toBe(200);
      expect(res.text).toBe('uploaded');
      expect((await readdir(fileDir)).includes(path.basename(__filename))).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(`Successfully uploaded file: ${path.basename(__filename)}`);
    });
  });

  describe('POST /command/:commandName', () => {
    test('returns 404 for unknown command.', async () => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app).post('/command/unknown').send({ input: 'video.mp4' });

      expect(res.status).toBe(404);
      expect(res.text).toEqual('command not found: unknown');
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('command not found: unknown');
    });

    test('executes command and returns created files.', async () => {
      await clearFileDir();
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const res = await request(app).post('/command/convert').send({ input: 'video.mp4', format: 'avi' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(['video.avi']);
      expect(commands.convert).toHaveBeenCalledTimes(1);
      expect(commands.convert).toBeCalledWith({ input: './files/video.mp4', format: 'avi' });
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith('Successfully finished convert command. Created files', ['video.avi']);
    });
  });

  describe('GET /download/:filename', () => {
    test('returns 404 if file does not exist.', async () => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app).get('/download/notfound.mp4');

      expect(res.status).toBe(404);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('File does not exist: notfound.mp4');
    });

    test('returns requested file.', async () => {
      await writeFile(path.join(fileDir, 'fileToDownload.ts'), '');
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const res = await request(app).get('/download/fileToDownload.ts');

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toEqual('attachment; filename="fileToDownload.ts"');
      expect(res.body).toBeDefined();
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith('Providing download for file: fileToDownload.ts');
    });
  });

  describe('DELETE /remove-files', () => {
    test('deletes all files.', async () => {
      await writeFile(path.join(fileDir, 'fileOne'), '');
      await writeFile(path.join(fileDir, 'fileTwo'), '');
      const files = (await readdir(fileDir)).length;
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const res = await request(app).delete('/remove-files');

      expect(res.status).toBe(200);
      expect(res.text).toEqual(`${files} files deleted`);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(`Successfully deleted ${files} files.`);
    });
  });

  describe('Fallbacks', () => {
    test('returns JSON 404 for unknown route.', async () => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app).get('/does-not-exist');

      expect(res.status).toBe(404);
      expect(res.body.error).toEqual('endpoint not found or invalid request method');
      expect(res.body.method).toEqual('GET');
      expect(res.body.path).toEqual('/does-not-exist');
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Not Found or invalid method: GET /does-not-exist');
    });

    test('returns 500 json on internal server error.', async () => {
      const error = new Error('test error message');
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      commands.convert.mockRejectedValueOnce(error);
      const res = await request(app).post('/command/convert').send({});

      expect(res.status).toBe(500);
      expect(res.text).toEqual('Error: test error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    });
  });
});
