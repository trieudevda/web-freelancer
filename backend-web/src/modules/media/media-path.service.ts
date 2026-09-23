import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

@Injectable()
export class MediaPathService {
  private readonly mediaRoot: string;

  constructor(config: ConfigService) {
    this.mediaRoot = resolve(config.getOrThrow<string>('MEDIA_ROOT'));
  }

  relativeFromAbsolute(filePath: string): string {
    const absolutePath = resolve(filePath);

    this.assertInsideRoot(absolutePath, BadRequestException);

    const relativePath = relative(this.mediaRoot, absolutePath);

    if (!relativePath) {
      throw new BadRequestException('Đường dẫn media không hợp lệ');
    }

    return relativePath.split(sep).join('/');
  }

  async resolveForRead(relativePath: string): Promise<string> {
    const absolutePath = this.resolveStoredPath(relativePath);

    try {
      const [realRoot, realFile] = await Promise.all([
        realpath(this.mediaRoot),
        realpath(absolutePath),
      ]);

      if (realFile !== realRoot && !realFile.startsWith(`${realRoot}${sep}`)) {
        throw new NotFoundException('Đường dẫn media không hợp lệ');
      }

      return realFile;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new NotFoundException('Không tìm thấy file media');
    }
  }

  resolveForDelete(relativePath: string): string {
    return this.resolveStoredPath(relativePath);
  }

  private resolveStoredPath(relativePath: string): string {
    if (
      !relativePath ||
      isAbsolute(relativePath) ||
      relativePath.includes('\0')
    ) {
      throw new NotFoundException('Đường dẫn media không hợp lệ');
    }

    const absolutePath = resolve(this.mediaRoot, relativePath);

    this.assertInsideRoot(absolutePath, NotFoundException);

    return absolutePath;
  }

  private assertInsideRoot(
    absolutePath: string,
    ExceptionType: typeof BadRequestException | typeof NotFoundException,
  ): void {
    if (
      absolutePath === this.mediaRoot ||
      !absolutePath.startsWith(`${this.mediaRoot}${sep}`)
    ) {
      throw new ExceptionType('Đường dẫn media không hợp lệ');
    }
  }
}
