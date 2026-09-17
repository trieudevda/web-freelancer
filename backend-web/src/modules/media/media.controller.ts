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
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import { CreateMediaDto } from './dto/create-media.dto';
import { SearchMediaDto } from './dto/search-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateMediaDto,
  ) {
    return this.mediaService.create(file, dto);
  }

  // Upload tối đa 20 ảnh/video cùng lúc
  @Post('bulk')
  @UseInterceptors(FilesInterceptor('files', 20))
  createMany(
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.mediaService.createMany(files);
  }

  // Thay ảnh/video cũ bằng file mới
  @Put(':id/file')
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
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMediaDto) {
    return this.mediaService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.requestDelete(id);
  }

  @Post(':id/restore')
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.restore(id);
  }
}
