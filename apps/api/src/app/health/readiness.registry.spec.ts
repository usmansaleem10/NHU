import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReadinessRegistry } from './readiness.registry';

afterEach(() => {
  vi.useRealTimers();
});

const up = () => Promise.resolve();
const down = () => Promise.reject(new Error('connect ECONNREFUSED 10.0.0.5:5432'));
const hang = () => new Promise<void>(() => undefined);

describe('ReadinessRegistry', () => {
  it('is ready when no checks are registered', async () => {
    expect(await new ReadinessRegistry().run()).toEqual({ status: 'ok', checks: {} });
  });

  it('is ready when every check passes', async () => {
    const registry = new ReadinessRegistry();
    registry.register({ name: 'postgres', check: up });
    registry.register({ name: 'redis', check: up });

    const report = await registry.run();

    expect(report.status).toBe('ok');
    expect(report.checks).toEqual({
      postgres: { status: 'up', durationMs: expect.any(Number) as number },
      redis: { status: 'up', durationMs: expect.any(Number) as number },
    });
  });

  it('is unavailable when any check fails, and reports which one', async () => {
    const registry = new ReadinessRegistry();
    registry.register({ name: 'postgres', check: down });
    registry.register({ name: 'redis', check: up });

    const report = await registry.run();

    expect(report.status).toBe('unavailable');
    expect(report.checks.postgres?.status).toBe('down');
    expect(report.checks.redis?.status).toBe('up');
    expect(JSON.stringify(report)).not.toContain('ECONNREFUSED');
  });

  it('marks a hanging check down after its timeout instead of hanging the probe', async () => {
    const registry = new ReadinessRegistry();
    registry.register({ name: 'redis', check: hang, timeoutMs: 20 });

    const report = await registry.run();

    expect(report).toMatchObject({ status: 'unavailable', checks: { redis: { status: 'down' } } });
  });

  it('runs checks concurrently', async () => {
    const registry = new ReadinessRegistry();
    const slow = () => new Promise<void>((resolve) => setTimeout(resolve, 60));
    registry.register({ name: 'a', check: slow });
    registry.register({ name: 'b', check: slow });
    registry.register({ name: 'c', check: slow });

    const started = performance.now();
    await registry.run();

    expect(performance.now() - started).toBeLessThan(150);
  });

  it('rejects two checks with the same name', () => {
    const registry = new ReadinessRegistry();
    registry.register({ name: 'postgres', check: up });

    expect(() => {
      registry.register({ name: 'postgres', check: up });
    }).toThrow(/postgres/);
  });

  it('treats a check that throws synchronously as down, leaving no timer behind', async () => {
    vi.useFakeTimers();
    const registry = new ReadinessRegistry({ cacheMs: 0 });
    registry.register({
      name: 'postgres',
      check: () => {
        throw new Error('pool not initialised');
      },
    });

    const report = await registry.run();

    expect(report.checks.postgres?.status).toBe('down');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aborts the signal handed to a check that times out', async () => {
    const registry = new ReadinessRegistry({ cacheMs: 0 });
    let received: AbortSignal | undefined;
    registry.register({
      name: 'redis',
      timeoutMs: 20,
      check: (signal) => {
        received = signal;
        return hang();
      },
    });

    await registry.run();

    expect(received?.aborted).toBe(true);
  });

  it('runs checks once for concurrent probes and reuses the report briefly', async () => {
    let now = 0;
    const registry = new ReadinessRegistry({ cacheMs: 1000, now: () => now });
    const check = vi.fn(() => Promise.resolve());
    registry.register({ name: 'postgres', check });

    await Promise.all([registry.run(), registry.run(), registry.run()]);
    expect(check).toHaveBeenCalledTimes(1);

    now = 999;
    await registry.run();
    expect(check).toHaveBeenCalledTimes(1);

    now = 1001;
    await registry.run();
    expect(check).toHaveBeenCalledTimes(2);
  });
});
