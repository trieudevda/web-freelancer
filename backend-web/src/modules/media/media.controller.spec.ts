import { jest as runtimeJest } from '@jest/globals';
import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { fileURLToPath } from 'node:url';
import type { CreateMediaDto } from './dto/create-media.dto.js';
import type { SearchMediaDto } from './dto/search-media.dto.js';
import type { UpdateMediaDto } from './dto/update-media.dto.js';
import { Media, MediaStatus, MediaType } from './entities/media.entity.js';
import { MediaController } from './media.controller.js';
import type { MediaService } from './media.service.js';

Object.assign(globalThis, { jest: runtimeJest });

const mediaFixture = (): Media => ({
  id: 'e55a2f4b-3a18-4936-8698-d7cc771b41c4',
  originalName: 'ảnh sản phẩm.jpg',
  fileName: 'product.jpg',
  relativePath: '2026/09/23/product.jpg',
  mimeType: 'image/jpeg',
  mediaType: MediaType.IMAGE,
  size: 1024,
  title: null,
  altText: null,
  status: MediaStatus.ACTIVE,
  deletedAt: null,
  deleteAfter: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('MediaController', () => {
  const media = mediaFixture();
  const create = jest.fn().mockResolvedValue(media);
  const createMany = jest.fn().mockResolvedValue({ total: 1, items: [media] });
  const replaceFile = jest.fn().mockResolvedValue({ media });
  const search = jest.fn().mockResolvedValue({ items: [media] });
  const findActive = jest.fn().mockResolvedValue(media);
  const getContentPath = jest.fn().mockResolvedValue({
    media,
    absolutePath: fileURLToPath(import.meta.url),
  });
  const update = jest.fn().mockResolvedValue(media);
  const requestDelete = jest.fn().mockResolvedValue(media);
  const restore = jest.fn().mockResolvedValue(media);
  const service = {
    create,
    createMany,
    replaceFile,
    search,
    findActive,
    getContentPath,
    update,
    requestDelete,
    restore,
  } as unknown as MediaService;
  const controller = new MediaController(service);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes a single file and metadata through unchanged', async () => {
    const file = { filename: 'product.jpg' } as Express.Multer.File;
    const dto = { title: 'Product', altText: 'Front' } as CreateMediaDto;
    await expect(controller.create(file, dto)).resolves.toBe(media);
    expect(create).toHaveBeenCalledWith(file, dto);
  });

  it('passes the complete bulk file array to the service', async () => {
    const files = [
      { filename: 'one.jpg' },
      { filename: 'two.jpg' },
    ] as Express.Multer.File[];
    await controller.createMany(files);
    expect(createMany).toHaveBeenCalledWith(files);
  });

  it('passes replacement, search and metadata operations to the service', async () => {
    const id = media.id;
    const file = { filename: 'new.jpg' } as Express.Multer.File;
    const searchDto = { type: MediaType.IMAGE, page: 2 } as SearchMediaDto;
    const updateDto = { title: 'Updated' } as UpdateMediaDto;

    await controller.replaceFile(id, file);
    await controller.search(searchDto);
    await controller.findOne(id);
    await controller.update(id, updateDto);
    await controller.remove(id);
    await controller.restore(id);

    expect(replaceFile).toHaveBeenCalledWith(id, file);
    expect(search).toHaveBeenCalledWith(searchDto);
    expect(findActive).toHaveBeenCalledWith(id);
    expect(update).toHaveBeenCalledWith(id, updateDto);
    expect(requestDelete).toHaveBeenCalledWith(id);
    expect(restore).toHaveBeenCalledWith(id);
  });

  it('sets safe inline headers and returns a stream for active media', async () => {
    const setHeader = jest.fn();
    const response = { setHeader } as unknown as Response;

    const result = await controller.content(media.id, response);

    expect(getContentPath).toHaveBeenCalledWith(media.id);
    expect(setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
    expect(setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(media.originalName)}`,
    );
    expect(result).toBeInstanceOf(StreamableFile);
  });
});
