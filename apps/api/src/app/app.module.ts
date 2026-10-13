import { randomBytes } from 'node:crypto';

import type { DynamicModule, ModuleMetadata } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import type { DestinationStream } from 'pino';
import type { Options as PinoHttpOptions } from 'pino-http';

import type { Env } from './config/env';
import { ENV } from './config/env.token';
import { ContractModule } from './contract/contract.module';
import { DocsController } from './contract/docs.controller';
import { ProblemDetailsFilter } from './errors/problem.filter';
import { HealthModule } from './health/health.module';
import { READINESS_OPTIONS } from './health/readiness.registry';
import { CursorCodec } from './list/cursor';
import { API_PREFIX } from './api-prefix';
import { createLoggerOptions } from './logging/logger';
import { REQUEST_ID_HEADER, upstreamRequestId } from './logging/request-id';
import { MetaController } from './meta/meta.controller';

export interface AppModuleOptions {
  /** Where JSON logs go; stdout when omitted. Tests pass an in-memory sink. */
  logDestination?: DestinationStream;
  /** Extra modules mounted next to the app's own (tests use this for probe controllers). */
  imports?: ModuleMetadata['imports'];
}

/** Orchestrator probes: exact paths only, so e.g. /api/v1/health-records is still logged. */
const PROBE_PATHS = new Set([`/${API_PREFIX}/health`, `/${API_PREFIX}/health/ready`]);

@Module({})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest modules are decorator-only classes
export class AppModule {
  static forRoot(env: Env, options: AppModuleOptions = {}): DynamicModule {
    // pino-http reuses the request id Fastify assigned (see createApp), so every log line
    // written while handling a request carries the same id the client sees.
    const pinoHttp: PinoHttpOptions = {
      ...createLoggerOptions(env.LOG_LEVEL),
      // Orchestrator probes hit these every few seconds; logging them drowns real traffic.
      // (middie rewrites req.url relative to the middleware mount; originalUrl is the real path.)
      autoLogging: {
        ignore: (req) =>
          PROBE_PATHS.has(
            ((req as { originalUrl?: string }).originalUrl ?? req.url ?? '').split('?')[0] ?? '',
          ),
      },
      customProps: (req) => {
        const upstream = env.TRUST_PROXY_REQUEST_ID
          ? undefined
          : upstreamRequestId(req.headers[REQUEST_ID_HEADER]);
        return upstream === undefined ? {} : { upstreamRequestId: upstream };
      },
    };
    return {
      module: AppModule,
      global: true,
      imports: [
        LoggerModule.forRoot({
          pinoHttp: options.logDestination ? [pinoHttp, options.logDestination] : pinoHttp,
        }),
        ContractModule,
        HealthModule,
        ...(options.imports ?? []),
      ],
      controllers: [MetaController, ...(env.API_DOCS_ENABLED ? [DocsController] : [])],
      providers: [
        { provide: ENV, useValue: env },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
        { provide: READINESS_OPTIONS, useValue: { cacheMs: env.READINESS_CACHE_MS } },
        {
          provide: CursorCodec,
          useValue: new CursorCodec(env.CURSOR_SECRET ?? randomBytes(32).toString('hex'), {
            ttlMs: env.CURSOR_TTL_SECONDS * 1000,
          }),
        },
      ],
      exports: [ENV, CursorCodec, READINESS_OPTIONS],
    };
  }
}
