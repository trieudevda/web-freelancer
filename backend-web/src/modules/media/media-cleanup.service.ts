// src/media/media-cleanup.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MediaService } from './media.service';

@Injectable()
export class MediaCleanupService {
  private readonly logger = new Logger(MediaCleanupService.name);
  constructor(private readonly mediaService: MediaService) {}

  // @Cron(CronExpression.EVERY_MINUTE, {
  @Cron('0 * * * * *', {
    name: 'media-hard-delete',
    waitForCompletion: true,
  })
  async deleteExpiredMedia() {
    // await this.mediaService.hardDeleteExpired();
    this.logger.log('Bắt đầu kiểm tra media hết hạn');

    const result = await this.mediaService.hardDeleteExpired();

    this.logger.log(
      `Kết quả: tìm thấy ${result.found}, ` +
        `đã xóa ${result.deleted}, lỗi ${result.failed}`,
    );
  }
}
