import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { open, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { MediaType } from './entities/media.entity.js';

export interface DetectedMediaFile {
  mimeType: string;
  mediaType: MediaType;
  extensions: string[];
}

const MP4_BRANDS = new Set([
  'avc1',
  'dash',
  'iso2',
  'iso5',
  'iso6',
  'isom',
  'mmp4',
  'mp41',
  'mp42',
  'msnv',
]);

@Injectable()
export class MediaFileValidationService {
  private readonly maxImageSize: number;
  private readonly maxVideoSize: number;

  constructor(config: ConfigService) {
    this.maxImageSize = config.getOrThrow<number>('MEDIA_MAX_IMAGE_SIZE');
    this.maxVideoSize = config.getOrThrow<number>('MEDIA_MAX_VIDEO_SIZE');
  }

  async validate(
    file: Express.Multer.File | undefined,
  ): Promise<DetectedMediaFile> {
    if (!file?.path) {
      throw new BadRequestException('Vui lòng chọn file cần tải lên');
    }

    const { header, tail, size } = await this.readSamples(file.path);
    const detected = this.detect(header);

    if (!detected) {
      throw new BadRequestException(
        'Nội dung file không phải ảnh hoặc video hợp lệ',
      );
    }

    if (
      size !== file.size ||
      !this.isStructurallyPlausible(detected, header, tail, size)
    ) {
      throw new BadRequestException(
        'Nội dung file ảnh hoặc video không hoàn chỉnh',
      );
    }

    const suppliedMime = file.mimetype.trim().toLowerCase();

    if (suppliedMime !== detected.mimeType) {
      throw new BadRequestException(
        'MIME type không khớp với nội dung thật của file',
      );
    }

    const extension = extname(file.originalname).toLowerCase();

    if (!detected.extensions.includes(extension)) {
      throw new BadRequestException(
        'Phần mở rộng không khớp với nội dung file',
      );
    }

    const maximumSize =
      detected.mediaType === MediaType.IMAGE
        ? this.maxImageSize
        : this.maxVideoSize;

    if (file.size <= 0 || file.size > maximumSize) {
      throw new BadRequestException(
        detected.mediaType === MediaType.IMAGE
          ? 'Ảnh vượt quá dung lượng cho phép'
          : 'Video vượt quá dung lượng cho phép',
      );
    }

    return detected;
  }

  private async readSamples(
    filePath: string,
  ): Promise<{ header: Buffer; tail: Buffer; size: number }> {
    const handle = await open(filePath, 'r');

    try {
      const { size } = await stat(filePath);
      const headerBuffer = Buffer.alloc(64);
      const headerRead = await handle.read(
        headerBuffer,
        0,
        headerBuffer.length,
        0,
      );
      const tailLength = Math.min(32, size);
      const tailBuffer = Buffer.alloc(tailLength);
      const tailRead = await handle.read(
        tailBuffer,
        0,
        tailLength,
        Math.max(0, size - tailLength),
      );

      return {
        header: headerBuffer.subarray(0, headerRead.bytesRead),
        tail: tailBuffer.subarray(0, tailRead.bytesRead),
        size,
      };
    } finally {
      await handle.close();
    }
  }

  private isStructurallyPlausible(
    detected: DetectedMediaFile,
    header: Buffer,
    tail: Buffer,
    size: number,
  ): boolean {
    switch (detected.mimeType) {
      case 'image/jpeg':
        return (
          size >= 32 &&
          tail.length >= 2 &&
          tail[tail.length - 2] === 0xff &&
          tail[tail.length - 1] === 0xd9
        );
      case 'image/png':
        return (
          size >= 45 &&
          header.toString('ascii', 12, 16) === 'IHDR' &&
          tail.includes(Buffer.from('IEND'))
        );
      case 'image/gif':
        return size >= 14 && tail[tail.length - 1] === 0x3b;
      case 'image/webp':
        return (
          size >= 20 &&
          header.length >= 12 &&
          header.readUInt32LE(4) + 8 === size
        );
      case 'image/avif':
      case 'video/mp4':
      case 'video/quicktime': {
        if (size < 16 || header.length < 12) {
          return false;
        }

        const boxSize = header.readUInt32BE(0);
        return boxSize >= 16 && boxSize <= size;
      }
      case 'video/webm':
        return size >= 8;
      default:
        return false;
    }
  }

  private detect(buffer: Buffer): DetectedMediaFile | null {
    if (this.startsWith(buffer, [0xff, 0xd8, 0xff])) {
      return this.image('image/jpeg', ['.jpg', '.jpeg']);
    }

    if (
      this.startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    ) {
      return this.image('image/png', ['.png']);
    }

    const ascii = buffer.toString('ascii');

    if (ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a')) {
      return this.image('image/gif', ['.gif']);
    }

    if (ascii.slice(0, 4) === 'RIFF' && ascii.slice(8, 12) === 'WEBP') {
      return this.image('image/webp', ['.webp']);
    }

    if (ascii.slice(4, 8) === 'ftyp') {
      const brands = this.readBrands(buffer);

      if (brands.some((brand) => brand === 'avif' || brand === 'avis')) {
        return this.image('image/avif', ['.avif']);
      }

      if (brands.includes('qt  ')) {
        return this.video('video/quicktime', ['.mov']);
      }

      if (brands.some((brand) => MP4_BRANDS.has(brand))) {
        return this.video('video/mp4', ['.mp4']);
      }
    }

    if (this.startsWith(buffer, [0x1a, 0x45, 0xdf, 0xa3])) {
      return this.video('video/webm', ['.webm']);
    }

    return null;
  }

  private readBrands(buffer: Buffer): string[] {
    const brands: string[] = [];

    for (let offset = 8; offset + 4 <= buffer.length; offset += 4) {
      brands.push(buffer.toString('ascii', offset, offset + 4));
    }

    return brands;
  }

  private startsWith(buffer: Buffer, signature: number[]): boolean {
    return signature.every((byte, index) => buffer[index] === byte);
  }

  private image(mimeType: string, extensions: string[]): DetectedMediaFile {
    return { mimeType, extensions, mediaType: MediaType.IMAGE };
  }

  private video(mimeType: string, extensions: string[]): DetectedMediaFile {
    return { mimeType, extensions, mediaType: MediaType.VIDEO };
  }
}
