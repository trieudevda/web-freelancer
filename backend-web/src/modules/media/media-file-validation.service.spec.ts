import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MediaType } from './entities/media.entity.js';
import { MediaFileValidationService } from './media-file-validation.service.js';

describe('MediaFileValidationService', () => {
  let directory: string;
  let service: MediaFileValidationService;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'media-validation-'));
    const values: Record<string, number> = {
      MEDIA_MAX_IMAGE_SIZE: 10_000,
      MEDIA_MAX_VIDEO_SIZE: 20_000,
    };
    const config = {
      getOrThrow: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;

    service = new MediaFileValidationService(config);
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  const createFile = async (
    name: string,
    mimeType: string,
    content: Buffer,
  ): Promise<Express.Multer.File> => {
    const path = join(directory, name);
    await writeFile(path, content);

    return {
      path,
      originalname: name,
      mimetype: mimeType,
      size: content.length,
    } as Express.Multer.File;
  };

  it('accepts a JPEG whose MIME, extension and magic bytes agree', async () => {
    const file = await createFile(
      'photo.jpg',
      'image/jpeg',
      Buffer.concat([
        Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
        Buffer.alloc(28),
        Buffer.from([0xff, 0xd9]),
      ]),
    );

    await expect(service.validate(file)).resolves.toEqual({
      mimeType: 'image/jpeg',
      mediaType: MediaType.IMAGE,
      extensions: ['.jpg', '.jpeg'],
    });
  });

  it('rejects a spoofed MIME type', async () => {
    const file = await createFile(
      'fake.jpg',
      'image/jpeg',
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );

    await expect(service.validate(file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects an extension that does not match the detected content', async () => {
    const file = await createFile(
      'photo.png',
      'image/jpeg',
      Buffer.concat([
        Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
        Buffer.alloc(28),
        Buffer.from([0xff, 0xd9]),
      ]),
    );

    await expect(service.validate(file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects missing and unknown file content', async () => {
    await expect(service.validate(undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    const file = await createFile(
      'unknown.jpg',
      'image/jpeg',
      Buffer.from('not-an-image'),
    );
    await expect(service.validate(file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
