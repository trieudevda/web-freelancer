import { jest as runtimeJest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import type { CreateMediaDto } from './dto/create-media.dto.js';
import type { SearchMediaDto } from './dto/search-media.dto.js';
import type { UpdateMediaDto } from './dto/update-media.dto.js';
import { Media, MediaStatus, MediaType } from './entities/media.entity.js';
import type {
  DetectedMediaFile,
  MediaFileValidationService,
} from './media-file-validation.service.js';
import type { MediaPathService } from './media-path.service.js';
import { MediaService } from './media.service.js';

Object.assign(globalThis, { jest: runtimeJest });

const mediaFixture = (overrides: Partial<Media> = {}): Media => ({
  id: 'e55a2f4b-3a18-4936-8698-d7cc771b41c4',
  originalName: 'product.jpg',
  fileName: 'product-random.jpg',
  relativePath: '2026/09/23/product-random.jpg',
  mimeType: 'image/jpeg',
  mediaType: MediaType.IMAGE,
  size: 128,
  title: 'Product',
  altText: 'Front view',
  status: MediaStatus.ACTIVE,
  deletedAt: null,
  deleteAfter: null,
  createdAt: new Date('2026-09-23T00:00:00Z'),
  updatedAt: new Date('2026-09-23T00:00:00Z'),
  ...overrides,
});

const fileFixture = (
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File =>
  ({
    fieldname: 'file',
    originalname: 'product.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    destination: 'storage/media',
    filename: 'product-random.jpg',
    path: 'E:/web-freelancer/backend-web/nonexistent/product-random.jpg',
    size: 128,
    stream: undefined,
    buffer: Buffer.alloc(0),
    ...overrides,
  }) as unknown as Express.Multer.File;

const imageDetection: DetectedMediaFile = {
  mimeType: 'image/jpeg',
  mediaType: MediaType.IMAGE,
  extensions: ['.jpg', '.jpeg'],
};

describe('MediaService', () => {
  const repositoryCreate = jest.fn();
  const repositorySave = jest.fn();
  const repositoryFind = jest.fn();
  const repositoryFindOneBy = jest.fn();
  const repositoryCreateQueryBuilder = jest.fn();
  const mediaRepository = {
    create: repositoryCreate,
    save: repositorySave,
    find: repositoryFind,
    findOneBy: repositoryFindOneBy,
    createQueryBuilder: repositoryCreateQueryBuilder,
  } as unknown as Repository<Media>;
  const txCreate = jest.fn();
  const txSave = jest.fn();
  const txFindOne = jest.fn();
  const txDelete = jest.fn();
  const txMerge = jest.fn((target: Media, dto: Partial<Media>) =>
    Object.assign(target, dto),
  );
  const transactionRepository = {
    create: txCreate,
    save: txSave,
    findOne: txFindOne,
    delete: txDelete,
    merge: txMerge,
  } as unknown as Repository<Media>;
  const manager = {
    getRepository: jest.fn().mockReturnValue(transactionRepository),
  } as unknown as EntityManager;
  const transaction = jest.fn(
    async (callback: (value: EntityManager) => Promise<unknown>) =>
      callback(manager),
  );
  const dataSource = { transaction } as unknown as DataSource;
  const validate = jest.fn();
  const fileValidation = { validate } as unknown as MediaFileValidationService;
  const relativeFromAbsolute = jest
    .fn()
    .mockReturnValue('2026/09/23/product-random.jpg');
  const resolveForRead = jest
    .fn()
    .mockResolvedValue('E:/media/2026/09/23/product-random.jpg');
  const resolveForDelete = jest
    .fn()
    .mockResolvedValue('E:/web-freelancer/backend-web/nonexistent/file.jpg');
  const mediaPath = {
    relativeFromAbsolute,
    resolveForRead,
    resolveForDelete,
  } as unknown as MediaPathService;
  const service = new MediaService(
    mediaRepository,
    dataSource,
    fileValidation,
    mediaPath,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    relativeFromAbsolute.mockReturnValue('2026/09/23/product-random.jpg');
    resolveForRead.mockResolvedValue('E:/media/2026/09/23/product-random.jpg');
    resolveForDelete.mockResolvedValue(
      'E:/web-freelancer/backend-web/nonexistent/file.jpg',
    );
  });

  it('validates and persists a single upload using detected content type', async () => {
    const file = fileFixture({ mimetype: 'untrusted/client-value' });
    const saved = mediaFixture();
    validate.mockResolvedValue(imageDetection);
    repositoryCreate.mockReturnValue(saved);
    repositorySave.mockResolvedValue(saved);
    const dto = { title: 'Product', altText: 'Front view' } as CreateMediaDto;

    await expect(service.create(file, dto)).resolves.toBe(saved);
    expect(validate).toHaveBeenCalledWith(file);
    expect(repositoryCreate).toHaveBeenCalledWith({
      originalName: file.originalname,
      fileName: file.filename,
      relativePath: '2026/09/23/product-random.jpg',
      mimeType: 'image/jpeg',
      mediaType: MediaType.IMAGE,
      size: file.size,
      title: dto.title,
      altText: dto.altText,
      status: MediaStatus.ACTIVE,
    });
  });

  it('rejects a missing or invalid upload before persistence', async () => {
    validate.mockRejectedValue(new BadRequestException('invalid'));
    await expect(
      service.create(undefined as unknown as Express.Multer.File, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repositorySave).not.toHaveBeenCalled();
  });

  it('validates every bulk file and saves them in one transaction', async () => {
    const files = [fileFixture(), fileFixture({ filename: 'second.jpg' })];
    const items = [mediaFixture(), mediaFixture({ id: 'second' })];
    validate.mockResolvedValue(imageDetection);
    txCreate.mockImplementation((value: Media) => value);
    txSave.mockResolvedValue(items);

    await expect(service.createMany(files)).resolves.toEqual({
      message: expect.any(String),
      total: 2,
      items,
    });
    expect(validate).toHaveBeenCalledTimes(2);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(txSave).toHaveBeenCalledWith(expect.any(Array));
  });

  it('rejects an empty bulk upload without opening a transaction', async () => {
    await expect(service.createMany([])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(transaction).not.toHaveBeenCalled();
  });

  it('replaces an active file under a row lock and preserves old metadata', async () => {
    const current = mediaFixture();
    const newFile = fileFixture({
      originalname: 'replacement.jpg',
      filename: 'replacement-random.jpg',
    });
    validate.mockResolvedValue(imageDetection);
    txFindOne.mockResolvedValue(current);
    txCreate.mockImplementation((value: Media) => ({
      ...value,
      id: 'old-copy',
    }));
    txSave.mockImplementation(async (value: Media) => value);

    const result = await service.replaceFile(current.id, newFile);

    expect(txFindOne).toHaveBeenCalledWith({
      where: { id: current.id, status: MediaStatus.ACTIVE },
      lock: { mode: 'pessimistic_write' },
    });
    const oldCopy = txCreate.mock.calls[0][0] as Media;
    expect(oldCopy.title).toBe('Product');
    expect(oldCopy.status).toBe(MediaStatus.PENDING_DELETE);
    expect(oldCopy.deleteAfter!.getTime() - oldCopy.deletedAt!.getTime()).toBe(
      7 * 24 * 60 * 60 * 1000,
    );
    expect(result.oldFile.status).toBe(MediaStatus.PENDING_DELETE);
    expect(txSave).toHaveBeenCalledTimes(2);
  });

  it('rejects replacement of missing media', async () => {
    validate.mockResolvedValue(imageDetection);
    txFindOne.mockResolvedValue(null);
    await expect(
      service.replaceFile('missing', fileFixture()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('builds escaped, stable and paginated search queries', async () => {
    const builder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mediaFixture()], 21]),
    };
    repositoryCreateQueryBuilder.mockReturnValue(builder);

    const query: SearchMediaDto = {
      q: ' 50%_OFF! ',
      type: MediaType.IMAGE,
      status: MediaStatus.PENDING_DELETE,
      page: 2,
      limit: 10,
    };
    const result = await service.search(query);

    expect(builder.where).toHaveBeenCalledWith('media.status = :status', {
      status: MediaStatus.PENDING_DELETE,
    });
    expect(builder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining("ESCAPE '!'"),
      { keyword: '%50!%!_off!!%' },
    );
    expect(builder.orderBy).toHaveBeenCalledWith('media.createdAt', 'DESC');
    expect(builder.addOrderBy).toHaveBeenCalledWith('media.id', 'DESC');
    expect(builder.skip).toHaveBeenCalledWith(10);
    expect(result.meta).toEqual({
      page: 2,
      limit: 10,
      total: 21,
      totalPages: 3,
    });
  });

  it('defaults search to active media and page one', async () => {
    const builder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    repositoryCreateQueryBuilder.mockReturnValue(builder);
    const result = await service.search({} as SearchMediaDto);
    expect(builder.where).toHaveBeenCalledWith('media.status = :status', {
      status: MediaStatus.ACTIVE,
    });
    expect(builder.skip).toHaveBeenCalledWith(0);
    expect(builder.take).toHaveBeenCalledWith(20);
    expect(result.meta.totalPages).toBe(0);
  });

  it('returns only active records and resolves their content path safely', async () => {
    const media = mediaFixture();
    repositoryFindOneBy.mockResolvedValue(media);
    await expect(service.findActive(media.id)).resolves.toBe(media);
    await expect(service.getContentPath(media.id)).resolves.toEqual({
      media,
      absolutePath: 'E:/media/2026/09/23/product-random.jpg',
    });
    expect(repositoryFindOneBy).toHaveBeenCalledWith({
      id: media.id,
      status: MediaStatus.ACTIVE,
    });
    expect(resolveForRead).toHaveBeenCalledWith(media.relativePath);
  });

  it('locks active metadata before updating only validated fields', async () => {
    const media = mediaFixture();
    const dto = { title: 'New title' } as UpdateMediaDto;
    txFindOne.mockResolvedValue(media);
    txSave.mockResolvedValue(media);
    await service.update(media.id, dto);
    expect(txFindOne).toHaveBeenCalledWith({
      where: { id: media.id, status: MediaStatus.ACTIVE },
      lock: { mode: 'pessimistic_write' },
    });
    expect(txMerge).toHaveBeenCalledWith(media, dto);
  });

  it('marks deletion once and keeps the original deadline on repeat', async () => {
    const media = mediaFixture();
    txFindOne.mockResolvedValue(media);
    txSave.mockImplementation(async (value: Media) => value);
    const first = await service.requestDelete(media.id);
    expect(first.status).toBe(MediaStatus.PENDING_DELETE);
    expect(first.deleteAfter!.getTime() - first.deletedAt!.getTime()).toBe(
      7 * 24 * 60 * 60 * 1000,
    );
    const originalDeadline = first.deleteAfter;

    const second = await service.requestDelete(media.id);
    expect(second.deleteAfter).toBe(originalDeadline);
    expect(txSave).toHaveBeenCalledTimes(1);
  });

  it('restores recoverable media and rejects an expired record', async () => {
    const recoverable = mediaFixture({
      status: MediaStatus.PENDING_DELETE,
      deletedAt: new Date(),
      deleteAfter: new Date(Date.now() + 60_000),
    });
    txFindOne.mockResolvedValueOnce(recoverable);
    txSave.mockImplementation(async (value: Media) => value);
    await expect(service.restore(recoverable.id)).resolves.toMatchObject({
      status: MediaStatus.ACTIVE,
      deletedAt: null,
      deleteAfter: null,
    });

    txFindOne.mockResolvedValueOnce(
      mediaFixture({
        status: MediaStatus.PENDING_DELETE,
        deleteAfter: new Date(Date.now() - 1),
      }),
    );
    await expect(service.restore(recoverable.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('hard-deletes expired records and treats missing physical files as success', async () => {
    const expired = mediaFixture({
      status: MediaStatus.PENDING_DELETE,
      deleteAfter: new Date(Date.now() - 60_000),
    });
    repositoryFind.mockResolvedValue([{ id: expired.id }]);
    txFindOne.mockResolvedValue(expired);
    txDelete.mockResolvedValue({ affected: 1 });

    await expect(service.hardDeleteExpired()).resolves.toEqual({
      found: 1,
      deleted: 1,
      failed: 0,
    });
    expect(repositoryFind).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { id: true },
        order: { deleteAfter: 'ASC', id: 'ASC' },
        take: 100,
      }),
    );
    expect(txFindOne).toHaveBeenCalledWith(
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
    expect(txDelete).toHaveBeenCalledWith(expired.id);
  });

  it('keeps the database record and reports failure for an unsafe cleanup path', async () => {
    const expired = mediaFixture({ status: MediaStatus.PENDING_DELETE });
    repositoryFind.mockResolvedValue([{ id: expired.id }]);
    txFindOne.mockResolvedValue(expired);
    resolveForDelete.mockRejectedValue(new NotFoundException('unsafe'));

    await expect(service.hardDeleteExpired()).resolves.toEqual({
      found: 1,
      deleted: 0,
      failed: 1,
    });
    expect(txDelete).not.toHaveBeenCalled();
  });
});
