// src/media/media.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { unlink } from 'fs/promises';
import { resolve, sep } from 'path';
import { DataSource, LessThanOrEqual, Repository } from 'typeorm';
import { CreateMediaDto } from './dto/create-media.dto';
import { SearchMediaDto } from './dto/search-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { Media, MediaStatus, MediaType } from './entities/media.entity';

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class MediaService {
  private readonly mediaRoot: string;

  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    private readonly dataSource: DataSource,
    config: ConfigService,
  ) {
    this.mediaRoot = resolve(config.get<string>('MEDIA_ROOT', 'storage/media'));
  }

  async create(file: Express.Multer.File, dto: CreateMediaDto) {
    try {
      this.validateFileSize(file);
      const relativePath = file.path
        .slice(this.mediaRoot.length)
        .replace(/^[/\\]+/, '')
        .split(sep)
        .join('/');

      const media = this.mediaRepository.create({
        originalName: file.originalname,
        fileName: file.filename,
        relativePath,
        mimeType: file.mimetype,
        mediaType: file.mimetype.startsWith('image/')
          ? MediaType.IMAGE
          : MediaType.VIDEO,
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
      files.map((v) => this.validateFileSize(v));
      const items = await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(Media);
        const mediaItems = files.map((file) =>
          repository.create({
            ...this.getFileData(file),
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
          deleteAfter: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        });

        // Cập nhật bản ghi hiện tại thành file mới
        Object.assign(currentMedia, this.getFileData(newFile));

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

    if (query.q?.trim()) {
      builder.andWhere(
        `(
          LOWER(media.originalName) LIKE :keyword
          OR LOWER(COALESCE(media.title, '')) LIKE :keyword
          OR LOWER(COALESCE(media.altText, '')) LIKE :keyword
        )`,
        {
          keyword: `%${query.q.trim().toLowerCase()}%`,
        },
      );
    }

    const [items, total] = await builder
      .orderBy('media.createdAt', 'DESC')
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
    const media = await this.findActive(id);

    this.mediaRepository.merge(media, dto);
    return this.mediaRepository.save(media);
  }

  async requestDelete(id: string) {
    const media = await this.mediaRepository.findOneBy({ id });

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

    return this.mediaRepository.save(media);
  }

  async restore(id: string) {
    const media = await this.mediaRepository.findOneBy({
      id,
      status: MediaStatus.PENDING_DELETE,
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

    return this.mediaRepository.save(media);
  }

  async getContentPath(id: string) {
    const media = await this.findActive(id);
    const absolutePath = resolve(this.mediaRoot, media.relativePath);

    // Chống đọc file nằm ngoài MEDIA_ROOT.
    if (
      absolutePath !== this.mediaRoot &&
      !absolutePath.startsWith(`${this.mediaRoot}${sep}`)
    ) {
      throw new NotFoundException('Đường dẫn file không hợp lệ');
    }

    return { media, absolutePath };
  }

  async hardDeleteExpired() {
    const expired = await this.mediaRepository.find({
      where: {
        status: MediaStatus.PENDING_DELETE,
        deleteAfter: LessThanOrEqual(new Date()),
      },
      take: 100,
    });
    let deleted = 0;
    let failed = 0;
    for (const media of expired) {
      const absolutePath = resolve(this.mediaRoot, media.relativePath);

      try {
        await unlink(absolutePath).catch((error) => {
          // File không còn tồn tại vẫn được xem là xóa thành công.
          if (error.code !== 'ENOENT') {
            throw error;
          }
        });

        await this.mediaRepository.delete(media.id);
        deleted++;
      } catch (error) {
        failed++;
        // Giữ lại record để cron thử lại ở lần kế tiếp.
        console.error(`Cannot delete media ${media.id}`, error);
      }
    }
    return {
      found: expired.length,
      deleted,
      failed,
    };
  }
  private getRelativePath(filePath: string) {
    return filePath
      .slice(this.mediaRoot.length)
      .replace(/^[/\\]+/, '')
      .split(sep)
      .join('/');
  }

  private getFileData(file: Express.Multer.File) {
    return {
      originalName: file.originalname,
      fileName: file.filename,
      relativePath: this.getRelativePath(file.path),
      mimeType: file.mimetype,
      mediaType: file.mimetype.startsWith('image/')
        ? MediaType.IMAGE
        : MediaType.VIDEO,
      size: file.size,
    };
  }
  private validateFileSize(file: Express.Multer.File) {
    const maxImageSize = 10 * 1024 * 1024;
    const maxVideoSize = 1024 * 1024 * 1024;

    if (file.mimetype.startsWith('image/') && file.size > maxImageSize) {
      throw new BadRequestException('Ảnh không được vượt quá 10 MB');
    }

    if (file.mimetype.startsWith('video/') && file.size > maxVideoSize) {
      throw new BadRequestException('Video không được vượt quá 1 GB');
    }
  }
}
