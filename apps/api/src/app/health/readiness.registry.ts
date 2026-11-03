import { Inject, Injectable, Logger, Optional } from '@nestjs/common';

export interface ReadinessCheck {
  /** Stable name used in logs, e.g. `postgres`, `redis`. Never sent to clients. */
  name: string;
  /**
   * Resolves when the dependency is usable; rejects, throws or times out when it is not.
   * `signal` aborts on timeout: pass it to the driver so the probe query is cancelled.
   */
  check: (signal: AbortSignal) => unknown;
  /** Per-check budget; a slower check counts as down. Default 2000 ms. */
  timeoutMs?: number;
}

export interface CheckResult {
  status: 'up' | 'down';
  durationMs: number;
}

/** Full report, for logs only; the HTTP probe answers with the overall status alone. */
export interface ReadinessDetails {
  status: 'ok' | 'unavailable';
  checks: Record<string, CheckResult>;
}

export interface ReadinessOptions {
  /** Reuse a report this long, so probe storms do not hammer dependencies. Default 1000 ms. */
  cacheMs?: number;
  /** Clock override (tests). */
  now?: () => number;
}

export const READINESS_OPTIONS = Symbol('READINESS_OPTIONS');

const DEFAULT_TIMEOUT_MS = 2000;
const DEFAULT_CACHE_MS = 1000;

/** Runs one check with a timeout; never leaves a timer or an unhandled rejection behind. */
async function runCheck({ check, timeoutMs }: ReadinessCheck): Promise<void> {
  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`timed out after ${String(timeoutMs ?? DEFAULT_TIMEOUT_MS)} ms`));
    }, timeoutMs ?? DEFAULT_TIMEOUT_MS);
  });
  try {
    // Promise.resolve().then turns a synchronous throw into a rejection inside the race.
    await Promise.race([Promise.resolve().then(() => check(controller.signal)), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pluggable readiness checks. Infrastructure modules register theirs at startup:
 * `onModuleInit() { this.readiness.register({ name: 'postgres', check: (signal) => ... }) }`.
 * Concurrent probes share one run, and a report is reused for `cacheMs`.
 */
@Injectable()
export class ReadinessRegistry {
  private readonly logger = new Logger(ReadinessRegistry.name);
  private readonly checks = new Map<string, ReadinessCheck>();
  private readonly cacheMs: number;
  private readonly now: () => number;
  private inFlight: Promise<ReadinessDetails> | undefined;
  private cached: { at: number; report: ReadinessDetails } | undefined;

  constructor(@Optional() @Inject(READINESS_OPTIONS) options: ReadinessOptions = {}) {
    this.cacheMs = options.cacheMs ?? DEFAULT_CACHE_MS;
    this.now = options.now ?? Date.now;
  }

  register(check: ReadinessCheck): void {
    if (this.checks.has(check.name)) {
      throw new Error(`Readiness check "${check.name}" is already registered`);
    }
    this.checks.set(check.name, check);
  }

  run(): Promise<ReadinessDetails> {
    if (this.cached && this.now() - this.cached.at < this.cacheMs) {
      return Promise.resolve(this.cached.report);
    }
    this.inFlight ??= this.runAll().finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }

  private async runAll(): Promise<ReadinessDetails> {
    const results = await Promise.all(
      [...this.checks.values()].map(async (check) => {
        const started = performance.now();
        let status: CheckResult['status'] = 'up';
        try {
          await runCheck(check);
        } catch (error) {
          status = 'down';
          this.logger.warn({ err: error, check: check.name }, 'readiness check failed');
        }
        return [
          check.name,
          { status, durationMs: Math.round(performance.now() - started) },
        ] as const;
      }),
    );
    const report: ReadinessDetails = {
      status: results.every(([, result]) => result.status === 'up') ? 'ok' : 'unavailable',
      checks: Object.fromEntries(results),
    };
    this.cached = { at: this.now(), report };
    return report;
  }
}
