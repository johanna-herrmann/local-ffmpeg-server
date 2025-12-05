import { jest, describe, test, expect, afterEach, beforeAll } from '@jest/globals';

let ffmpeg, getAudioCodec, commands;

beforeAll(async () => {
  jest.unstable_mockModule('../lib/ffmpeg.js', () => ({
    ffmpeg: jest.fn(async () => {})
  }));

  jest.unstable_mockModule('../lib/ffprobe.js', () => ({
    getAudioCodec: jest.fn(() => {
      return 'mp3';
    })
  }));

  ({ ffmpeg } = await import('../lib/ffmpeg.js'));
  ({ getAudioCodec } = await import('../lib/ffprobe.js'));
  ({ commands } = await import('../lib/commands.js'));
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('commands', () => {
  test('convert calls with correct args.', async () => {
    const command = commands.convert;

    await command({ input: 'input.mp4', format: 'avi', codecs: { video: 'h264', audio: 'mp3' } });

    expect(ffmpeg).toHaveBeenCalledTimes(1);
    expect(ffmpeg).toHaveBeenCalledWith(['-i', 'input.mp4', '-c:a', 'mp3', '-c:v', 'h264', '-f', 'avi', 'input.avi']);
  });

  test('splitHls calls with correct args.', async () => {
    const command = commands['split-hls'];

    await command({ input: 'input.mp4', segmentDuration: 12, codecs: { video: 'h264', audio: 'aac' } });

    expect(ffmpeg).toHaveBeenCalledTimes(1);
    expect(ffmpeg).toHaveBeenCalledWith([
      '-i',
      'input.mp4',
      '-c:a',
      'aac',
      '-c:v',
      'h264',
      '-f',
      'ts',
      '-hls_time',
      '12',
      '-hls_playlist_type',
      'vod',
      '-hls_segment_filename',
      'input_%03d.ts',
      'input.m3u8'
    ]);
  });

  test('concatHlsToMp4 calls with correct args.', async () => {
    const command = commands['concat-hls-to-mp4'];

    await command({ input: 'input.txt' });

    expect(ffmpeg).toHaveBeenCalledTimes(1);
    expect(ffmpeg).toHaveBeenCalledWith(['-f', 'concat', '-safe', '0', '-i', 'input.txt', '-c', 'copy', 'input.mp4']);
  });

  test('split calls with correct args.', async () => {
    const command = commands.split;

    await command({ input: 'input.mp4', segmentDuration: 12 });

    expect(ffmpeg).toHaveBeenCalledTimes(1);
    expect(ffmpeg).toHaveBeenCalledWith([
      '-i',
      'input.mp4',
      '-c',
      'copy',
      '-map',
      '0',
      '-segment_time',
      '12',
      '-f',
      'segment',
      'input_%03d.mp4'
    ]);
  });

  test('extractPart calls with correct args.', async () => {
    const command = commands['extract-part'];

    await command({ input: 'input.mp4', begin: '0:02', end: '1:42' });

    expect(ffmpeg).toHaveBeenCalledTimes(1);
    expect(ffmpeg).toHaveBeenCalledWith([
      '-i',
      'input.mp4',
      '-ss',
      '0:02',
      '-to',
      '1:42',
      '-c',
      'copy',
      'input_extracted_part.mp4'
    ]);
  });

  test('extractVideo calls with correct args.', async () => {
    const command = commands['extract-video'];

    await command({ input: 'input.mp4' });

    expect(ffmpeg).toHaveBeenCalledTimes(1);
    expect(ffmpeg).toHaveBeenCalledWith(['-i', 'input.mp4', '-va', '-c:v', 'copy', 'input_video_only.mp4']);
  });

  test('extractAudio calls with correct args.', async () => {
    const command = commands['extract-audio'];

    await command({ input: 'input.mp4', audioCodec: 'copy', extension: 'mp3' });

    expect(ffmpeg).toHaveBeenCalledTimes(1);
    expect(ffmpeg).toHaveBeenCalledWith(['-i', 'input.mp4', '-vn', '-c:a', 'copy', 'input.mp3']);
  });

  test('scale calls with correct args.', async () => {
    const command = commands.scale;

    await command({ input: 'input.mp4', width: 800, height: 600 });

    expect(ffmpeg).toHaveBeenCalledTimes(1);
    expect(ffmpeg).toHaveBeenCalledWith(['-i', 'input.mp4', '-vf', 'scale=800:600', 'input_scaled.mp4']);
  });

  test('transpose calls with correct args.', async () => {
    const command = commands.transpose;

    await command({ input: 'input.mp4', transposeType: 2 });

    expect(ffmpeg).toHaveBeenCalledTimes(1);
    expect(ffmpeg).toHaveBeenCalledWith(['-i', 'input.mp4', '-vf', 'transpose=2', 'input_transposed.mp4']);
  });

  test('modifyFps calls with correct args.', async () => {
    const command = commands['modify-fps'];

    await command({ input: 'input.mp4', fps: 50 });

    expect(ffmpeg).toHaveBeenCalledTimes(1);
    expect(ffmpeg).toHaveBeenCalledWith(['-i', 'input.mp4', '-vf', 'fps=50', 'input_50fps.mp4']);
  });

  test('crop calls with correct args.', async () => {
    const command = commands.crop;

    await command({ input: 'input.mp4', width: 50, height: 40, x: 20, y: 10 });

    expect(ffmpeg).toHaveBeenCalledTimes(1);
    expect(ffmpeg).toHaveBeenCalledWith(['-i', 'input.mp4', '-vf', 'crop=50:40:20:10', 'input_cropped.mp4']);
  });

  test('watermark calls with correct args.', async () => {
    const command = commands.watermark;

    await command({ input: 'input.mp4', text: 'watermark', x: 10, y: 20, fontsize: 32, fontcolor: 'blue' });

    expect(ffmpeg).toHaveBeenCalledTimes(1);
    expect(ffmpeg).toHaveBeenCalledWith([
      '-i',
      'input.mp4',
      '-vf',
      "drawtext=text='watermark':x=10:y=20:fontsize=32:fontcolor=blue",
      'input_watermarked.mp4'
    ]);
  });

  describe('edge cases', () => {
    test('convert has codec fallback.', async () => {
      const command = commands.convert;

      await command({ input: 'input_no_codec.mp4', format: 'avi' });
      await command({ input: 'input_no_audio_codec.mp4', format: 'avi', codecs: { video: 'h264' } });
      await command({ input: 'input_no_video_codec.mp4', format: 'avi', codecs: { audio: 'mp3' } });

      expect(ffmpeg).toHaveBeenCalledTimes(3);
      expect(ffmpeg).toHaveBeenCalledWith([
        '-i',
        'input_no_codec.mp4',
        '-c:a',
        'copy',
        '-c:v',
        'copy',
        '-f',
        'avi',
        'input_no_codec.avi'
      ]);
      expect(ffmpeg).toHaveBeenCalledWith([
        '-i',
        'input_no_audio_codec.mp4',
        '-c:a',
        'copy',
        '-c:v',
        'h264',
        '-f',
        'avi',
        'input_no_audio_codec.avi'
      ]);
      expect(ffmpeg).toHaveBeenCalledWith([
        '-i',
        'input_no_video_codec.mp4',
        '-c:a',
        'mp3',
        '-c:v',
        'copy',
        '-f',
        'avi',
        'input_no_video_codec.avi'
      ]);
    });

    test('splitHls has codec and segmentDuration fallback.', async () => {
      const command = commands['split-hls'];

      await command({ input: 'input_no_codec.mp4', segmentDuration: 12 });
      await command({ input: 'input_no_duration.mp4', codecs: { audio: 'aac', video: 'h264' } });

      expect(ffmpeg).toHaveBeenCalledTimes(2);
      expect(ffmpeg).toHaveBeenCalledWith([
        '-i',
        'input_no_codec.mp4',
        '-c:a',
        'copy',
        '-c:v',
        'copy',
        '-f',
        'ts',
        '-hls_time',
        '12',
        '-hls_playlist_type',
        'vod',
        '-hls_segment_filename',
        'input_no_codec_%03d.ts',
        'input_no_codec.m3u8'
      ]);
      expect(ffmpeg).toHaveBeenCalledWith([
        '-i',
        'input_no_duration.mp4',
        '-c:a',
        'aac',
        '-c:v',
        'h264',
        '-f',
        'ts',
        '-hls_time',
        '7',
        '-hls_playlist_type',
        'vod',
        '-hls_segment_filename',
        'input_no_duration_%03d.ts',
        'input_no_duration.m3u8'
      ]);
    });

    test('split has segmentDuration fallback.', async () => {
      const command = commands.split;

      command({ input: 'input.mp4' });

      expect(ffmpeg).toHaveBeenCalledTimes(1);
      expect(ffmpeg).toHaveBeenCalledWith([
        '-i',
        'input.mp4',
        '-c',
        'copy',
        '-map',
        '0',
        '-segment_time',
        '7',
        '-f',
        'segment',
        'input_%03d.mp4'
      ]);
    });

    test('extractAudio has codec and extension fallback.', async () => {
      const command = commands['extract-audio'];

      await command({ input: 'input_no_codec.mp4', extension: 'aac' });
      await command({ input: 'input_no_extension.mp4', audioCodec: 'wav' });

      expect(ffmpeg).toHaveBeenCalledTimes(2);
      expect(ffmpeg).toHaveBeenCalledWith(['-i', 'input_no_codec.mp4', '-vn', '-c:a', 'mp3', 'input_no_codec.aac']);
      expect(ffmpeg).toHaveBeenCalledWith([
        '-i',
        'input_no_extension.mp4',
        '-vn',
        '-c:a',
        'wav',
        'input_no_extension.wav'
      ]);
    });

    test('scale fixes negative to positive numbers.', async () => {
      const command = commands.scale;

      await command({ input: 'input.mp4', width: -1200, height: -900 });

      expect(ffmpeg).toHaveBeenCalledTimes(1);
      expect(ffmpeg).toHaveBeenCalledWith(['-i', 'input.mp4', '-vf', 'scale=1200:900', 'input_scaled.mp4']);
    });

    test('transpose is always 0 .. 3.', async () => {
      const command = commands.transpose;

      await command({ input: 'input_-7.mp4', transposeType: -7 });
      await command({ input: 'input_12.mp4', transposeType: 12 });

      expect(ffmpeg).toHaveBeenCalledTimes(2);
      expect(ffmpeg).toHaveBeenCalledWith(['-i', 'input_-7.mp4', '-vf', 'transpose=3', 'input_-7_transposed.mp4']);
      expect(ffmpeg).toHaveBeenCalledWith(['-i', 'input_12.mp4', '-vf', 'transpose=0', 'input_12_transposed.mp4']);
    });

    test('modifyFps has always positive fps.', async () => {
      const command = commands['modify-fps'];

      await command({ input: 'input.mp4', fps: -42 });

      expect(ffmpeg).toHaveBeenCalledTimes(1);
      expect(ffmpeg).toHaveBeenCalledWith(['-i', 'input.mp4', '-vf', 'fps=42', 'input_42fps.mp4']);
    });

    test('crop has always positive numbers.', async () => {
      const command = commands.crop;

      await command({ input: 'input.mp4', width: -500, height: -400, x: -200, y: -100 });

      expect(ffmpeg).toHaveBeenCalledTimes(1);
      expect(ffmpeg).toHaveBeenCalledWith(['-i', 'input.mp4', '-vf', 'crop=500:400:200:100', 'input_cropped.mp4']);
    });

    test('watermark has always positive numbers and has fallbacks.', async () => {
      const command = commands.watermark;

      await command({
        input: 'input_negative.mp4',
        text: 'watermark',
        x: -100,
        y: -200,
        fontsize: -24,
        fontcolor: 'blue'
      });
      await command({ input: 'input_none.mp4' });

      expect(ffmpeg).toHaveBeenCalledTimes(2);
      expect(ffmpeg).toHaveBeenCalledWith([
        '-i',
        'input_negative.mp4',
        '-vf',
        "drawtext=text='watermark':x=100:y=200:fontsize=24:fontcolor=blue",
        'input_negative_watermarked.mp4'
      ]);
      expect(ffmpeg).toHaveBeenCalledWith([
        '-i',
        'input_none.mp4',
        '-vf',
        "drawtext=text='text':x=0:y=0:fontsize=16:fontcolor=black",
        'input_none_watermarked.mp4'
      ]);
    });
  });
});
