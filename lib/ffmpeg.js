import pathToFfmpeg from 'ffmpeg-static';
import { spawn } from 'child_process';
import { state } from './state.js';

let totalDuration = null; // Sekunden
let lastPrinted = 0;

const timeToSeconds = function (t) {
  const parts = t.split(':');
  return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
};

const logProcess = function (percent) {
  const progress = percent ? `${percent}%` : '...';
  state('progress', progress);
};

const handleData = function (data) {
  const text = data.toString();

  // get total duration
  if (!totalDuration) {
    const durMatch = text.match(/Duration: (\d+:\d+:\d+\.\d+)/);
    if (durMatch) {
      totalDuration = timeToSeconds(durMatch[1]);
    }
  }

  // log progress
  const timeMatch = text.match(/time=(\d+:\d+:\d+\.\d+)/);
  if (timeMatch && totalDuration) {
    const current = timeToSeconds(timeMatch[1]);
    const percent = Math.floor((current / totalDuration) * 100);

    // log only on +1%
    if (percent !== lastPrinted) {
      lastPrinted = percent;
      logProcess(percent);
    }
  }
};

const handleError = function (error, reject) {
  state('error', error);
  process.stderr.write(`\nError: ${error}`);
  reject(error);
};

const ffmpeg = function (args) {
  return new Promise((resolve, reject) => {
    const ffmpegProcess = spawn(pathToFfmpeg, args);

    ffmpegProcess.stderr.on('data', handleData);

    ffmpegProcess.on('error', (error) => handleError(error, reject));

    ffmpegProcess.on('exit', () => {
      logProcess(100);
      resolve();
    });
  });
};

export { ffmpeg };
