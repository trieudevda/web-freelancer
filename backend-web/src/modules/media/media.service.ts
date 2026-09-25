// src/media/media.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { unlink } from 'fs/promises';
import { DataSource, LessThanOrEqual, Repository } from 'typeorm';
import { CreateMediaDto } from './dto/create-media.dto.js';
import { SearchMediaDto } from './dto/search-media.dto.js';
import { UpdateMediaDto } from './dto/update-media.dto.js';
import { Media, MediaStatus } from './entities/media.entity.js';
import { MediaFileValidationService } from './media-file-validation.service.js';
import type { DetectedMediaFile } from './media-file-validation.service.js';
import { MediaPathService } from './media-path.service.js';

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    private readonly dataSource: DataSource,
    private readonly fileValidation: MediaFileValidationService,
    private readonly mediaPath: MediaPathService,
  ) {}

  async create(file: Express.Multer.File, dto: CreateMediaDto) {
    try {
      const detected = await this.fileValidation.validate(file);
      const relativePath = this.mediaPath.relativeFromAbsolute(file.path);

      const media = this.mediaRepository.create({
        originalName: file.originalname,
        fileName: file.filename,
        relativePath,
        mimeType: detected.mimeType,
        mediaType: detected.mediaType,
        size: file.size,
        title: dto.title ?? null,
        altText: dto.altText ?? null,
        status: MediaStatus.ACTIVE,
      });

      return await this.mediaRepository.save(media);
    } catch (error) {
      if (file?.path) {
        await unlink(file.path).catch(() => undefined);
      }
      throw error;
    }
  }

  async createMany(files: Express.Multer.File[]) {
    if (!files?.length) {
      throw new BadRequestException('Vui lòng chọn ít nhất một ảnh hoặc video');
    }
    try {
      const detectedFiles = await Promise.all(
        files.map((file) => this.fileValidation.validate(file)),
      );
      const items = await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(Media);
        const mediaItems = files.map((file, index) =>
          repository.create({
            ...this.getFileData(file, detectedFiles[index]),
            title: null,
            altText: null,
            status: MediaStatus.ACTIVE,
          }),
        );
        return repository.save(mediaItems);
      });
      return {
        message: 'Upload media thành công',
        total: items.length,
        items,
      };
    } catch (error) {
      await Promise.allSettled(files.map((file) => unlink(file.path)));
      throw error;
    }
  }

  async replaceFile(id: string, newFile: Express.Multer.File) {
    if (!newFile) {
      throw new BadRequestException('Vui lòng chọn file mới');
    }

    try {
      const detected = await this.fileValidation.validate(newFile);

      return await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(Media);

        const currentMedia = await repository.findOne({
          where: {
            id,
            status: MediaStatus.ACTIVE,
          },
          lock: {
            mode: 'pessimistic_write',
          },
        });

        if (!currentMedia) {
          throw new NotFoundException('Không tìm thấy media cần cập nhật');
        }

        const now = new Date();

        const oldMedia = repository.create({
          originalName: currentMedia.originalName,
          fileName: currentMedia.fileName,
          relativePath: currentMedia.relativePath,
          mimeType: currentMedia.mimeType,
          mediaType: currentMedia.mediaType,
          size: currentMedia.size,
          title: currentMedia.title,
          altText: currentMedia.altText,
          status: MediaStatus.PENDING_DELETE,
          deletedAt: now,
          deleteAfter: new Date(now.getTime() + SEVEN_DAYS),
        });

        // Cập nhật bản ghi hiện tại thành file mới
        Object.assign(currentMedia, this.getFileData(newFile, detected));

        /*
         * Phải update media hiện tại trước để giải phóng
         * unique relativePath của file cũ.
         */
        const updatedMedia = await repository.save(currentMedia);

        await repository.save(oldMedia);

        return {
          message: 'Thay đổi media thành công',
          media: updatedMedia,
          oldFile: {
            status: MediaStatus.PENDING_DELETE,
            deleteAfter: oldMedia.deleteAfter,
          },
        };
      });
    } catch (error) {
      // Transaction thất bại thì xóa file mới
      await unlink(newFile.path).catch(() => undefined);
      throw error;
    }
  }
  escapeLike(value: string): string {
    return value.replace(/[!%_]/g, '!$&');
  }

  async search(query: SearchMediaDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const builder = this.mediaRepository.createQueryBuilder('media');

    builder.where('media.status = :status', {
      status: query.status ?? MediaStatus.ACTIVE,
    });

    if (query.type) {
      builder.andWhere('media.mediaType = :type', {
        type: query.type,
      });
    }
    const keyword = query.q
      ? `%${this.escapeLike(query.q.trim().toLowerCase())}%`
      : null;

    if (query.q?.trim()) {
      builder.andWhere(
        `(
          LOWER(media.originalName) LIKE :keyword ESCAPE '!'
          OR LOWER(COALESCE(media.title, '')) LIKE :keyword ESCAPE '!'
          OR LOWER(COALESCE(media.altText, '')) LIKE :keyword ESCAPE '!'
        )`,
        {
          keyword: keyword,
        },
      );
    }

    const [items, total] = await builder
      .orderBy('media.createdAt', 'DESC')
      .addOrderBy('media.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findActive(id: string) {
    const media = await this.mediaRepository.findOneBy({
      id,
      status: MediaStatus.ACTIVE,
    });

    if (!media) {
      throw new NotFoundException('Không tìm thấy media');
    }

    return media;
  }

  async update(id: string, dto: UpdateMediaDto) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Media);
      const media = await repository.findOne({
        where: { id, status: MediaStatus.ACTIVE },
        lock: { mode: 'pessimistic_write' },
      });

      if (!media) {
        throw new NotFoundException('Không tìm thấy media');
      }

      repository.merge(media, dto);
      return repository.save(media);
    });
  }

  async requestDelete(id: string) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Media);
      const media = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!media) {
        throw new NotFoundException('Không tìm thấy media');
      }

      // Gọi DELETE nhiều lần không làm tăng lại thời hạn 7 ngày.
      if (media.status === MediaStatus.PENDING_DELETE) {
        return media;
      }

      const now = new Date();

      media.status = MediaStatus.PENDING_DELETE;
      media.deletedAt = now;
      media.deleteAfter = new Date(now.getTime() + SEVEN_DAYS);

      return repository.save(media);
    });
  }

  async restore(id: string) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Media);
      const media = await repository.findOne({
        where: { id, status: MediaStatus.PENDING_DELETE },
        lock: { mode: 'pessimistic_write' },
      });

      if (!media) {
        throw new NotFoundException('Không tìm thấy media trong thùng rác');
      }

      if (media.deleteAfter && media.deleteAfter <= new Date()) {
        throw new ConflictException('Media đã hết thời gian khôi phục');
      }

      media.status = MediaStatus.ACTIVE;
      media.deletedAt = null;
      media.deleteAfter = null;

      return repository.save(media);
    });
  }

  async getContentPath(id: string) {
    const media = await this.findActive(id);
    const absolutePath = await this.mediaPath.resolveForRead(
      media.relativePath,
    );

    return { media, absolutePath };
  }

  async hardDeleteExpired() {
    const cutoff = new Date();
    const expired = await this.mediaRepository.find({
      where: {
        status: MediaStatus.PENDING_DELETE,
        deleteAfter: LessThanOrEqual(cutoff),
      },
      select: { id: true },
      order: { deleteAfter: 'ASC', id: 'ASC' },
      take: 100,
    });
    let deleted = 0;
    let failed = 0;

    for (const candidate of expired) {
      try {
        const removed = await this.dataSource.transaction(async (manager) => {
          const repository = manager.getRepository(Media);
          const media = await repository.findOne({
            where: {
              id: candidate.id,
              status: MediaStatus.PENDING_DELETE,
              deleteAfter: LessThanOrEqual(cutoff),
            },
            lock: { mode: 'pessimistic_write' },
          });

          // Another application instance may already have processed it.
          if (!media) {
            return false;
          }

          const absolutePath = await this.mediaPath.resolveForDelete(
            media.relativePath,
          );

          await unlink(absolutePath).catch((error) => {
            // File không còn tồn tại vẫn được xem là xóa thành công.
            if (!this.isMissingFileError(error)) {
              throw error;
            }
          });

          await repository.delete(media.id);
          return true;
        });

        if (removed) {
          deleted++;
        }
      } catch (error) {
        failed++;
        // Giữ lại record để cron thử lại ở lần kế tiếp.
        this.logger.error({
          event: 'media_hard_delete_failed',
          mediaId: candidate.id,
          error,
        });
      }
    }
    return {
      found: expired.length,
      deleted,
      failed,
    };
  }
  private getFileData(file: Express.Multer.File, detected: DetectedMediaFile) {
    return {
      originalName: file.originalname,
      fileName: file.filename,
      relativePath: this.mediaPath.relativeFromAbsolute(file.path),
      mimeType: detected.mimeType,
      mediaType: detected.mediaType,
      size: file.size,
    };
  }
  private isMissingFileError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    );
  }
}
