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
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@Controller('media')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(USER_ROLE.SUPERADMIN, USER_ROLE.ADMIN, USER_ROLE.EDITOR)
@ApiTags('media')
@ApiCookieAuth('access-token')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @ApiOperation({ summary: 'Upload one image or video (admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string', maxLength: 255 },
        altText: { type: 'string', maxLength: 500 },
      },
    },
  })
  @Roles(USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN, USER_ROLE.EDITOR)
  @UseInterceptors(FileInterceptor('file'))
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateMediaDto,
  ) {
    return this.mediaService.create(file, dto);
  }

  // Upload tối đa 20 ảnh/video cùng lúc
  @Post('bulk')
  @ApiOperation({ summary: 'Upload up to twenty media files (admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files'],
      properties: {
        files: {
          type: 'array',
          maxItems: 20,
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @Roles(USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN, USER_ROLE.EDITOR)
  @Throttle({ default: { limit: 2, ttl: 60_000 } })
  @UseInterceptors(FilesInterceptor('files', 20))
  createMany(@UploadedFiles() files: Express.Multer.File[]) {
    return this.mediaService.createMany(files);
  }

  // Thay ảnh/video cũ bằng file mới
  @Put(':id/file')
  @ApiOperation({ summary: 'Replace a media file and retain the old file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @Roles(USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN, USER_ROLE.EDITOR)
  @UseInterceptors(FileInterceptor('file'))
  replaceFile(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.mediaService.replaceFile(id, file);
  }

  @Get()
  @ApiOperation({ summary: 'Search the media library' })
  search(@Query() query: SearchMediaDto) {
    return this.mediaService.search(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get active media metadata' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.findActive(id);
  }

  @Get(':id/content')
  @ApiOperation({ summary: 'Stream active media content' })
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
  @ApiOperation({ summary: 'Update media title and alternative text' })
  @Roles(USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN, USER_ROLE.EDITOR)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMediaDto) {
    return this.mediaService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Move media to the seven-day trash' })
  @Roles(USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN, USER_ROLE.EDITOR)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.requestDelete(id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore media before its deletion deadline' })
  @Roles(USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN, USER_ROLE.EDITOR)
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.restore(id);
  }
}
