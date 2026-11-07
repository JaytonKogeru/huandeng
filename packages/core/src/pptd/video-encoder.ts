import { execFile, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { PptdError } from './types';

const execute = promisify(execFile);

export interface VideoCapabilities {
  available: boolean;
  formats: string[];
  message: string;
}

export async function findVideoEncoder(): Promise<string> {
  const binary = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const configured = process.env.HUANDENG_FFMPEG;
  const candidates = configured
    ? [configured]
    : [path.join(path.dirname(process.execPath), 'tools', binary), binary];
  for (const executable of candidates) {
    if (path.isAbsolute(executable) && !existsSync(executable)) continue;
    try {
      const { stdout } = await execute(executable, ['-hide_banner', '-encoders'], {
        timeout: 8000,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      });
      if (/\blibx264\b/.test(stdout)) return executable;
    } catch {}
  }
  throw new PptdError(
    'INVALID_REQUEST',
    '未找到支持 H.264 的 FFmpeg。请安装 FFmpeg 并加入 PATH，或设置 HUANDENG_FFMPEG 为可执行文件路径，然后重新打开编辑器。',
  );
}

export function createVideoEncoder(
  executable: string,
  output: string,
  fps: number,
  signal: AbortSignal,
) {
  signal.throwIfAborted();
  const child = spawn(
    executable,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'image2pipe',
      '-vcodec',
      'png',
      '-framerate',
      String(fps),
      '-i',
      'pipe:0',
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '20',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-y',
      output,
    ],
    { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] },
  );
  let diagnostic = '';
  let failure: Error | undefined;
  let done = false;
  child.stderr.on('data', (chunk: Buffer) => {
    diagnostic = `${diagnostic}${chunk.toString()}`.slice(-8192);
  });
  child.stdin.on('error', (error: Error) => {
    failure = error;
  });
  const abort = () => {
    child.kill('SIGKILL');
  };
  signal.addEventListener('abort', abort, { once: true });
  const completion = new Promise<void>((resolve, reject) => {
    child.once('error', (error) => {
      failure = error;
      reject(error);
    });
    child.once('close', (code) => {
      done = true;
      signal.removeEventListener('abort', abort);
      if (signal.aborted) reject(new Error('视频导出已取消。'));
      else if (code === 0) resolve();
      else {
        failure = new Error(
          `视频编码失败 (${code})：${diagnostic || failure?.message || '编码器意外退出'}`,
        );
        reject(failure);
      }
    });
  });
  void completion.catch(() => {});
  return {
    async write(frame: Buffer) {
      signal.throwIfAborted();
      if (failure || done) throw failure ?? new Error('视频编码器已退出。');
      await new Promise<void>((resolve, reject) =>
        child.stdin.write(frame, (error) => (error ? reject(error) : resolve())),
      );
    },
    async finish() {
      signal.throwIfAborted();
      child.stdin.end();
      await completion;
    },
    async close() {
      if (!done) child.kill('SIGKILL');
      await completion.catch(() => {});
    },
  };
}

export function assertVideoAsset(source: string, bytes: Buffer) {
  const head = bytes.subarray(0, 12).toString('ascii');
  let animatedPng = false;
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    for (let offset = 8; offset + 12 <= bytes.length; ) {
      const length = bytes.readUInt32BE(offset);
      if (length > bytes.length - offset - 12) break;
      const type = bytes.toString('ascii', offset + 4, offset + 8);
      if (type === 'acTL') {
        animatedPng = true;
        break;
      }
      if (type === 'IEND') break;
      offset += length + 12;
    }
  }
  const svg =
    /\.svg$/i.test(source) ||
    source.startsWith('data:image/svg') ||
    /^\s*(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(bytes.subarray(0, 512).toString());
  if (
    head.startsWith('GIF8') ||
    animatedPng ||
    (head.startsWith('RIFF') && head.endsWith('WEBP') && bytes.includes(Buffer.from('ANIM')))
  )
    throw new PptdError(
      'INVALID_DOCUMENT',
      `视频暂不支持自主播放的 GIF / APNG / WebP 素材：${source.slice(0, 180)}。请先改用静态图片；PPTD 关键帧动画可正常导出。`,
    );
  if (
    svg &&
    /<(?:[\w.-]+:)?(?:animate\w*|set|script|foreignObject)\b|\banimation(?:-[\w-]+)?\s*[:=]|@(?:-webkit-)?keyframes/i.test(
      bytes.toString('utf8'),
    )
  )
    throw new PptdError(
      'INVALID_DOCUMENT',
      `视频暂不支持带自主动画或脚本的 SVG：${source.slice(0, 180)}。请使用静态 SVG 或 PNG。`,
    );
}
