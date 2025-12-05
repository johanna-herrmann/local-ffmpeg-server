import { ffmpeg } from './ffmpeg.js';
import { getAudioCodec } from './ffprobe.js';

const getNameFromInput = function (input) {
  return input.substring(0, input.lastIndexOf('.'));
};

const getExtensionFromInput = function (input) {
  return input.substring(input.lastIndexOf('.') + 1);
};

const convert = async function ({ input, format, codecs }) {
  await ffmpeg([
    '-i',
    input,
    '-c:a',
    codecs?.audio ?? 'copy',
    '-c:v',
    codecs?.video ?? 'copy',
    '-f',
    format,
    `${getNameFromInput(input)}.${format}`
  ]);
};

const splitHls = async function ({ input, segmentDuration, codecs }) {
  const name = getNameFromInput(input);
  await ffmpeg([
    '-i',
    input,
    '-c:a',
    codecs?.audio ?? 'copy',
    '-c:v',
    codecs?.video ?? 'copy',
    '-f',
    'ts',
    '-hls_time',
    Math.abs(segmentDuration ?? 7) + '',
    '-hls_playlist_type',
    'vod',
    '-hls_segment_filename',
    `${name}_%03d.ts`,
    `${name}.m3u8`
  ]);
};

const concatHlsToMp4 = async function ({ input }) {
  await ffmpeg(['-f', 'concat', '-safe', '0', '-i', input, '-c', 'copy', `${getNameFromInput(input)}.mp4`]);
};

const split = async function ({ input, segmentDuration }) {
  await ffmpeg([
    '-i',
    input,
    '-c',
    'copy',
    '-map',
    '0',
    '-segment_time',
    Math.abs(segmentDuration ?? 7) + '',
    '-f',
    'segment',
    `${getNameFromInput(input)}_%03d.${getExtensionFromInput(input)}`
  ]);
};

const extractPart = async function ({ input, begin, end }) {
  await ffmpeg([
    '-i',
    input,
    '-ss',
    begin,
    '-to',
    end,
    '-c',
    'copy',
    `${getNameFromInput(input)}_extracted_part.${getExtensionFromInput(input)}`
  ]);
};

const extractVideo = async function ({ input }) {
  await ffmpeg([
    '-i',
    input,
    '-va',
    '-c:v',
    'copy',
    `${getNameFromInput(input)}_video_only.${getExtensionFromInput(input)}`
  ]);
};

const extractAudio = async function ({ input, audioCodec, extension }) {
  const codec = audioCodec ?? getAudioCodec(input);
  await ffmpeg(['-i', input, '-vn', '-c:a', codec, `${getNameFromInput(input)}.${extension ?? codec}`]);
};

const scale = async function ({ input, width, height }) {
  await ffmpeg([
    '-i',
    input,
    '-vf',
    `scale=${Math.abs(width ?? 0)}:${Math.abs(height ?? 0)}`,
    `${getNameFromInput(input)}_scaled.${getExtensionFromInput(input)}`
  ]);
};

const transpose = async function ({ input, transposeType }) {
  await ffmpeg([
    '-i',
    input,
    '-vf',
    `transpose=${Math.abs(transposeType ?? 0) % 4}`,
    `${getNameFromInput(input)}_transposed.${getExtensionFromInput(input)}`
  ]);
};

const modifyFps = async function ({ input, fps }) {
  const fpsValue = Math.abs(fps ?? 0);
  await ffmpeg([
    '-i',
    input,
    '-vf',
    `fps=${fpsValue}`,
    `${getNameFromInput(input)}_${fpsValue}fps.${getExtensionFromInput(input)}`
  ]);
};

const crop = async function ({ input, width, height, x, y }) {
  await ffmpeg([
    '-i',
    input,
    '-vf',
    `crop=${Math.abs(width ?? 0)}:${Math.abs(height ?? 0)}:${Math.abs(x ?? 0)}:${Math.abs(y ?? 0)}`,
    `${getNameFromInput(input)}_cropped.${getExtensionFromInput(input)}`
  ]);
};

const watermark = async function ({ input, text, x, y, fontsize, fontcolor }) {
  const xValue = Math.abs(x ?? 0);
  const yValue = Math.abs(y ?? 0);
  const fontSizeValue = Math.abs(fontsize ?? 16);
  await ffmpeg([
    '-i',
    input,
    '-vf',
    `drawtext=text='${text ?? 'text'}':x=${xValue}:y=${yValue}:fontsize=${fontSizeValue}:fontcolor=${fontcolor ?? 'black'}`,
    `${getNameFromInput(input)}_watermarked.${getExtensionFromInput(input)}`
  ]);
};

const commands = {
  convert,
  'split-hls': splitHls,
  split,
  'concat-hls-to-mp4': concatHlsToMp4,
  'extract-part': extractPart,
  'extract-video': extractVideo,
  'extract-audio': extractAudio,
  scale,
  transpose,
  'modify-fps': modifyFps,
  crop,
  watermark
};

export { commands };
