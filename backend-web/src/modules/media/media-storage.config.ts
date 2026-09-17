// src/media/media-storage.config.ts
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModuleOptions } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { mkdir } from 'fs/promises';
import { diskStorage } from 'multer';
import { resolve, join, parse } from 'path';

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

function getDateParts(date: Date, timeZone: string) {
  const values: Record<string, string> = {};

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  }

  return values;
}

function slugFileName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 80);
}

export function createMediaMulterOptions(
  config: ConfigService,
): MulterModuleOptions {
  const root = resolve(config.get<string>('MEDIA_ROOT', 'storage/media'));

  const timeZone = config.get<string>('MEDIA_TIMEZONE', 'Asia/Ho_Chi_Minh');

  return {
    limits: {
      fileSize: Number(config.get('MEDIA_MAX_FILE_SIZE', 500 * 1024 * 1024)),
    },

    fileFilter: (_request, file, callback) => {
      if (!MIME_EXTENSIONS[file.mimetype]) {
        return callback(
          new BadRequestException('Chỉ cho phép tải ảnh hoặc video hợp lệ'),
          false,
        );
      }

      callback(null, true);
    },

    storage: diskStorage({
      destination: (_request, _file, callback) => {
        const date = getDateParts(new Date(), timeZone);

        const directory = join(root, date.year, date.month, date.day);

        mkdir(directory, { recursive: true })
          .then(() => callback(null, directory))
          .catch((error: Error) => callback(error, ''));
      },

      filename: (_request, file, callback) => {
        const now = new Date();
        const date = getDateParts(now, timeZone);

        const baseName = slugFileName(parse(file.originalname).name) || 'media';

        const timestamp =
          `${date.year}${date.month}${date.day}-` +
          `${date.hour}${date.minute}${date.second}` +
          String(now.getMilliseconds()).padStart(3, '0');

        const random = randomUUID().slice(0, 8);
        const extension = MIME_EXTENSIONS[file.mimetype];

        callback(null, `${baseName}-${timestamp}-${random}${extension}`);
      },
    }),
  };
}
