import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { monitorEventLoopDelay } from 'node:perf_hooks';

@Injectable()
export class EventLoopMonitorService implements OnModuleDestroy {
  private readonly logger = new Logger(EventLoopMonitorService.name);
  private readonly histogram = monitorEventLoopDelay({ resolution: 20 });
  private readonly interval: NodeJS.Timeout;

  constructor(config: ConfigService) {
    const thresholdMs = config.get<number>('EVENT_LOOP_LAG_THRESHOLD_MS', 200);

    this.histogram.enable();
    this.interval = setInterval(() => {
      const p99Ms = Math.round(this.histogram.percentile(99) / 1_000_000);

      if (p99Ms >= thresholdMs) {
        this.logger.warn({
          event: 'event_loop_lag',
          p99Ms,
          thresholdMs,
          rssBytes: process.memoryUsage().rss,
          heapUsedBytes: process.memoryUsage().heapUsed,
        });
      }

      this.histogram.reset();
    }, 10_000);
    this.interval.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.interval);
    this.histogram.disable();
  }
}
