import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MediaPathService } from './media-path.service.js';

describe('MediaPathService', () => {
  let root: string;
  let service: MediaPathService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'media-path-'));
    const config = {
      getOrThrow: jest.fn(() => root),
    } as unknown as ConfigService;

    service = new MediaPathService(config);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('creates a normalized relative path for a file inside media root', async () => {
    const directory = join(root, '2026', '09', '23');
    const filePath = join(directory, 'photo.jpg');
    await mkdir(directory, { recursive: true });
    await writeFile(filePath, 'content');

    expect(service.relativeFromAbsolute(filePath)).toBe('2026/09/23/photo.jpg');
    await expect(service.resolveForRead('2026/09/23/photo.jpg')).resolves.toBe(
      filePath,
    );
  });

  it('rejects stored traversal paths for reads and deletes', async () => {
    await expect(
      service.resolveForRead('../outside.jpg'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(() => service.resolveForDelete('../outside.jpg')).toThrow(
      NotFoundException,
    );
  });

  it('rejects uploaded file paths outside media root', () => {
    expect(() =>
      service.relativeFromAbsolute(join(tmpdir(), 'outside.jpg')),
    ).toThrow(BadRequestException);
  });
});
