import 'reflect-metadata';

import type { IncomingMessage } from 'node:http';

import { API_VERSION } from '@hims/contracts';
import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';

import type { AppModuleOptions } from './app.module';
import { AppModule } from './app.module';
import type { Env } from './config/env';
import { REQUEST_ID_HEADER, resolveRequestId } from './logging/request-id';

export const API_PREFIX = `api/${API_VERSION}`;

/** Builds the configured (not yet listening) application. */
export async function createApp(
  env: Env,
  options: AppModuleOptions = {},
): Promise<NestFastifyApplication> {
  const adapter = new FastifyAdapter({
    // Fastify owns the request id; pino-http and error responses reuse request.id.
    genReqId: (req: IncomingMessage) => resolveRequestId(req.headers[REQUEST_ID_HEADER]),
  });
  adapter.getInstance().addHook('onRequest', (request, reply, done) => {
    void reply.header(REQUEST_ID_HEADER, request.id);
    done();
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.forRoot(env, options),
    adapter,
    { bufferLogs: true },
  );
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix(API_PREFIX);
  app.enableShutdownHooks();
  return app;
}
