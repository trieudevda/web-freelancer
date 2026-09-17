// GHI CHÚ API MEDIA
//
// POST /media — Upload một ảnh hoặc video.
//   POST /media/bulk — Upload hàng loạt ảnh và video, tối đa 20 file.
//   GET /media — Lấy danh sách và tìm kiếm media.
//   GET /media?type=image — Lấy danh sách hình ảnh.
//   GET /media?type=video — Lấy danh sách video.
//   GET /media?status=pending_delete — Xem danh sách đang chờ xóa.
//   GET /media/:id — Xem thông tin chi tiết media.
//   GET /media/:id/content — Xem, phát hoặc tải file.
//   PATCH /media/:id — Sửa tiêu đề và alt text.
//   PUT /media/:id/file — Thay ảnh/video cũ bằng file mới. File cũ chờ xóa trong 7 ngày.
//   DELETE /media/:id — Đưa media vào thùng rác và tự động xóa sau 7 ngày.
//   POST /media/:id/restore — Khôi phục media trước thời hạn xóa.
//   Tìm kiếm:
//   GET /media?q=tu-khoa&type=image&status=active&page=1&limit=20
//     Trạng thái:
//   * active: Đang hoạt động.
// * pending_delete: Đang chờ xóa.
//   Cron:
// * Chạy mỗi phút.
// * Xóa file vật lý và bản ghi database khi hết thời hạn 7 ngày.

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media } from './entities/media.entity';
import { MediaCleanupService } from './media-cleanup.service';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { createMediaMulterOptions } from './media-storage.config';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Media]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: createMediaMulterOptions,
    }),
  ],
  controllers: [MediaController],
  providers: [MediaService, MediaCleanupService],
  exports: [MediaService],
})
export class MediaModule {}
