import {
  type CallHandler,
  type ExecutionContext,
  StreamableFile,
} from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { ApiResponseInterceptor } from './api-response.interceptor.js';

describe('ApiResponseInterceptor', () => {
  const context = {} as ExecutionContext;

  const nextWith = <T>(value: T): CallHandler<T> => ({
    handle: () => of(value),
  });

  it('wraps successful data in a consistent envelope', async () => {
    const interceptor = new ApiResponseInterceptor<{ id: number }>();

    await expect(
      lastValueFrom(interceptor.intercept(context, nextWith({ id: 1 }))),
    ).resolves.toEqual({
      success: true,
      data: { id: 1 },
    });
  });

  it.each([undefined, null])(
    'normalizes %s response data to null',
    async (value) => {
      const interceptor = new ApiResponseInterceptor();

      await expect(
        lastValueFrom(interceptor.intercept(context, nextWith(value))),
      ).resolves.toEqual({
        success: true,
        data: null,
      });
    },
  );

  it('does not wrap StreamableFile responses', async () => {
    const interceptor = new ApiResponseInterceptor<StreamableFile>();
    const file = new StreamableFile(Buffer.from('content'));

    await expect(
      lastValueFrom(interceptor.intercept(context, nextWith(file))),
    ).resolves.toBe(file);
  });
});
