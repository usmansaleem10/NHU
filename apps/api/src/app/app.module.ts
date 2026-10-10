import type { DynamicModule, ModuleMetadata } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import type { DestinationStream } from 'pino';
import type { Options as PinoHttpOptions } from 'pino-http';

import type { Env } from './config/env';
import { ENV } from './config/env.token';
import { ProblemDetailsFilter } from './errors/problem.filter';
import { createLoggerOptions } from './logging/logger';

export interface AppModuleOptions {
  /** Where JSON logs go; stdout when omitted. Tests pass an in-memory sink. */
  logDestination?: DestinationStream;
  /** Extra modules mounted next to the app's own (tests use this for probe controllers). */
  imports?: ModuleMetadata['imports'];
}

@Module({})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest modules are decorator-only classes
export class AppModule {
  static forRoot(env: Env, options: AppModuleOptions = {}): DynamicModule {
    // pino-http reuses the request id Fastify assigned (see createApp), so every log line
    // written while handling a request carries the same id the client sees.
    const pinoHttp: PinoHttpOptions = createLoggerOptions(env.LOG_LEVEL);
    return {
      module: AppModule,
      global: true,
      imports: [
        LoggerModule.forRoot({
          pinoHttp: options.logDestination ? [pinoHttp, options.logDestination] : pinoHttp,
        }),
        ...(options.imports ?? []),
      ],
      providers: [
        { provide: ENV, useValue: env },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
      exports: [ENV],
    };
  }
}
