import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { open } from 'node:fs/promises';
import { extname } from 'node:path';
import { MediaType } from './entities/media.entity.js';

interface DetectedMediaFile {
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

    const header = await this.readHeader(file.path);
    const detected = this.detect(header);

    if (!detected) {
      throw new BadRequestException(
        'Nội dung file không phải ảnh hoặc video hợp lệ',
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

  private async readHeader(filePath: string): Promise<Buffer> {
    const handle = await open(filePath, 'r');

    try {
      const buffer = Buffer.alloc(64);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);

      return buffer.subarray(0, bytesRead);
    } finally {
      await handle.close();
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
