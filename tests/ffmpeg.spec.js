import { jest, describe, test, expect, beforeEach, beforeAll } from '@jest/globals';

let mockSpawn;
let mockState;

beforeAll(() => {
  mockSpawn = jest.fn();
  mockState = jest.fn();

  jest.unstable_mockModule('child_process', () => {
    return { spawn: mockSpawn };
  });

  jest.unstable_mockModule('../lib/state.js', () => {
    return { state: mockState };
  });
});

let ffmpeg;
beforeAll(async () => {
  ({ ffmpeg } = await import('../lib/ffmpeg.js'));
});

describe('ffmpeg progress parsing', () => {
  let mockFfmpegProcess;
  let stderrHandlers = {};
  let eventHandlers = {};

  beforeEach(() => {
    mockSpawn.mockClear();
    mockState.mockClear();
    stderrHandlers = {};
    eventHandlers = {};

    mockFfmpegProcess = {
      stderr: {
        on: jest.fn((evt, fn) => {
          stderrHandlers[evt] = fn;
        })
      },
      on: jest.fn((evt, fn) => {
        eventHandlers[evt] = fn;
      })
    };

    mockSpawn.mockReturnValue(mockFfmpegProcess);
  });

  test('reports progress correctly', async () => {
    const p = ffmpeg(['-i', 'input.mp4']);

    stderrHandlers['data'](Buffer.from('Duration: 00:00:10.00\n'));
    stderrHandlers['data'](Buffer.from('frame=3 time=00:00:03.00\n'));
    eventHandlers['exit']();

    await p;

    expect(mockState).toHaveBeenCalledWith('progress', '30%');
    expect(mockState).toHaveBeenCalledWith('progress', '100%');
  });

  test('should call state("error", ...) on ffmpeg error', async () => {
    const args = ['-i', 'input.mp4'];

    const promise = ffmpeg(args);

    const error = new Error('mock error');
    eventHandlers['error'](error);

    await expect(promise).rejects.toThrow('mock error');

    expect(mockState).toHaveBeenCalledWith('error', error);
  });
});
