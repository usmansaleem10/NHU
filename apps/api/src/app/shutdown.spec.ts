import type { AddressInfo } from 'node:net';

import { Controller, Get, Module } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadEnv } from './config/env';
import { createApp } from './create-app';

let releaseSlowRequest: () => void = () => undefined;
let slowRequestStarted: () => void = () => undefined;

@Controller('probe')
class SlowController {
  @Get('slow')
  async slow(): Promise<{ done: true }> {
    slowRequestStarted();
    await new Promise<void>((resolve) => {
      releaseSlowRequest = resolve;
    });
    return { done: true };
  }
}

@Module({ controllers: [SlowController] })
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest modules are decorator-only classes
class SlowModule {}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('graceful shutdown', () => {
  it('drains in-flight requests on SIGTERM, then stops accepting connections', async () => {
    // Nest re-sends the signal to the process after closing; keep the test runner alive.
    const kill = vi.spyOn(process, 'kill').mockImplementation(() => true);
    const app: NestFastifyApplication = await createApp(
      loadEnv({ NODE_ENV: 'test', LOG_LEVEL: 'silent' }),
      { imports: [SlowModule] },
    );
    await app.listen({ port: 0, host: '127.0.0.1' });
    const { port } = app.getHttpServer().address() as AddressInfo;
    const base = `http://127.0.0.1:${String(port)}`;

    const started = new Promise<void>((resolve) => {
      slowRequestStarted = resolve;
    });
    const inFlight = fetch(`${base}/api/v1/probe/slow`);
    await started;

    // Same call Node makes for a real SIGTERM (listeners receive the signal name).
    process.emit('SIGTERM', 'SIGTERM');
    // Shutdown is under way but must wait for the in-flight request.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(kill).not.toHaveBeenCalled();

    releaseSlowRequest();
    const response = await inFlight;
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ done: true });

    await vi.waitFor(() => {
      expect(kill).toHaveBeenCalledWith(process.pid, 'SIGTERM');
    });
    await expect(fetch(`${base}/api/v1/health`)).rejects.toThrow();
  });
});
