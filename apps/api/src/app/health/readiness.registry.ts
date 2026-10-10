import type { ReadinessReport } from '@hims/contracts';
import { Injectable, Logger } from '@nestjs/common';

export interface ReadinessCheck {
  /** Stable name shown in the report, e.g. `postgres`, `redis`. */
  name: string;
  /** Resolves when the dependency is usable; rejects (or times out) when it is not. */
  check: () => Promise<unknown>;
  /** Per-check budget; a slower check counts as down. Default 2000 ms. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 2000;

class CheckTimeoutError extends Error {
  override readonly name = 'CheckTimeoutError';
}

function withTimeout(run: () => Promise<unknown>, timeoutMs: number): Promise<unknown> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new CheckTimeoutError(`timed out after ${String(timeoutMs)} ms`));
    }, timeoutMs);
  });
  return Promise.race([run(), timeout]).finally(() => {
    clearTimeout(timer);
  });
}

/**
 * Pluggable readiness checks. Infrastructure modules register theirs at startup:
 * `onModuleInit() { this.readiness.register({ name: 'postgres', check: () => db.execute(sql\`select 1\`) }) }`.
 * Failure reasons are logged, never returned to the caller.
 */
@Injectable()
export class ReadinessRegistry {
  private readonly logger = new Logger(ReadinessRegistry.name);
  private readonly checks = new Map<string, ReadinessCheck>();

  register(check: ReadinessCheck): void {
    if (this.checks.has(check.name)) {
      throw new Error(`Readiness check "${check.name}" is already registered`);
    }
    this.checks.set(check.name, check);
  }

  async run(): Promise<ReadinessReport> {
    const results = await Promise.all(
      [...this.checks.values()].map(async ({ name, check, timeoutMs }) => {
        const started = performance.now();
        let status: 'up' | 'down' = 'up';
        try {
          await withTimeout(check, timeoutMs ?? DEFAULT_TIMEOUT_MS);
        } catch (error) {
          status = 'down';
          this.logger.warn({ err: error, check: name }, 'readiness check failed');
        }
        return [name, { status, durationMs: Math.round(performance.now() - started) }] as const;
      }),
    );
    return {
      status: results.every(([, result]) => result.status === 'up') ? 'ok' : 'unavailable',
      checks: Object.fromEntries(results),
    };
  }
}
