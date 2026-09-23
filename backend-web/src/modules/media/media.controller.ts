// src/media/media.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import { CreateMediaDto } from './dto/create-media.dto.js';
import { SearchMediaDto } from './dto/search-media.dto.js';
import { UpdateMediaDto } from './dto/update-media.dto.js';
import { MediaService } from './media.service.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { USER_ROLE } from '../../config/constants/user/user-role.constants.js';
import { Throttle } from '@nestjs/throttler';

@Controller('media')
@UseGuards(SessionAuthGuard, RolesGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @Roles(USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN)
  @UseInterceptors(FileInterceptor('file'))
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateMediaDto,
  ) {
    return this.mediaService.create(file, dto);
  }

  // Upload tối đa 20 ảnh/video cùng lúc
  @Post('bulk')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN)
  @Throttle({ default: { limit: 2, ttl: 60_000 } })
  @UseInterceptors(FilesInterceptor('files', 20))
  createMany(@UploadedFiles() files: Express.Multer.File[]) {
    return this.mediaService.createMany(files);
  }

  // Thay ảnh/video cũ bằng file mới
  @Put(':id/file')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN)
  @UseInterceptors(FileInterceptor('file'))
  replaceFile(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.mediaService.replaceFile(id, file);
  }

  @Get()
  search(@Query() query: SearchMediaDto) {
    return this.mediaService.search(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.findActive(id);
  }

  @Get(':id/content')
  async content(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { media, absolutePath } = await this.mediaService.getContentPath(id);

    response.setHeader('Content-Type', media.mimeType);
    response.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(media.originalName)}`,
    );

    return new StreamableFile(createReadStream(absolutePath));
  }

  @Patch(':id')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMediaDto) {
    return this.mediaService.update(id, dto);
  }

  @Delete(':id')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.requestDelete(id);
  }

  @Post(':id/restore')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN)
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.restore(id);
  }
}
