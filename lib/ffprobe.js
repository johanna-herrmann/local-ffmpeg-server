import ffprobe from 'ffprobe-static';
import { execSync } from 'child_process';

const getAudioCodec = function (input) {
  const result = execSync(
    `${ffprobe.path} -v error -select_streams a -show_entries stream=codec_name -of default=nw=1:nk=1  "${input}"`
  );
  return result.toString('utf8').split('\r\n')?.at(0) ?? 'mp3';
};

export { getAudioCodec };
