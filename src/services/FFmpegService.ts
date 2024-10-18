import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

const ffmpeg = createFFmpeg({ log: true });

export interface Subtitle {
  startTime: number;
  duration: number;
  text: string;
}

export const extractSubtitles = async (videoFile: File): Promise<Subtitle[]> => {
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }

  ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(videoFile));

  await ffmpeg.run('-i', 'input.mp4', '-map', '0:s:0', 'subtitles.srt');

  try {
  const data = ffmpeg.FS('readFile', 'subtitles.srt');
  const subtitles = new TextDecoder().decode(data);

    return parseSRT(subtitles);
  } catch (error) {
    console.error('Error extracting subtitles:', error);
    return [];
  }
};

export const rebuildSubtitles = async (videoFile: File, subtitles: Subtitle[]): Promise<Blob> => {
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }

  ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(videoFile));
  ffmpeg.FS('writeFile', 'subtitles.srt', generateSRT(subtitles));

  await ffmpeg.run(
    '-i', 'input.mp4',
    '-i', 'subtitles.srt',
    '-c', 'copy',
    '-c:s', 'mov_text',
    '-map', '0:v',
    '-map', '0:a',
    '-map', '1',
    'output.mp4'
  );

  const data = ffmpeg.FS('readFile', 'output.mp4');
  return new Blob([data.buffer], { type: 'video/mp4' });
};

const parseSRT = (srtContent: string): Subtitle[] => {
  const subtitles: Subtitle[] = [];
  const subtitleBlocks = srtContent.trim().split('\n\n');

  subtitleBlocks.forEach((block) => {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      const timeCode = lines[1].split(' --> ');
      const startTime = timeStringToSeconds(timeCode[0]);
      const endTime = timeStringToSeconds(timeCode[1]);
      const text = lines.slice(2).join('\n');

      subtitles.push({
        startTime,
        duration: endTime - startTime,
        text,
      });
    }
  });

  return subtitles;
};

const generateSRT = (subtitles: Subtitle[]): string => {
  return subtitles
    .map((subtitle, index) => {
      const startTime = secondsToTimeString(subtitle.startTime);
      const endTime = secondsToTimeString(subtitle.startTime + subtitle.duration);
      return `${index + 1}\n${startTime} --> ${endTime}\n${subtitle.text}`;
    })
    .join('\n\n');
};

const timeStringToSeconds = (timeString: string): number => {
  const [hours, minutes, seconds] = timeString.split(':').map(parseFloat);
  return hours * 3600 + minutes * 60 + seconds;
};

const secondsToTimeString = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = (totalSeconds % 60).toFixed(3);
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.padStart(6, '0')}`;
};
