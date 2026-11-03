import 'reflect-metadata';

import type { IncomingMessage } from 'node:http';

import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';

import { API_PREFIX } from './api-prefix';
import type { AppModuleOptions } from './app.module';
import { AppModule } from './app.module';
import type { Env } from './config/env';
import { DOCS_PATH } from './contract/docs.controller';
import { REQUEST_ID_HEADER, resolveRequestId } from './logging/request-id';

/** Builds the configured (not yet listening) application. */
export async function createApp(
  env: Env,
  options: AppModuleOptions = {},
): Promise<NestFastifyApplication> {
  const adapter = new FastifyAdapter({
    // Fastify owns the request id; pino-http and error responses reuse request.id.
    genReqId: (req: IncomingMessage) =>
      resolveRequestId(req.headers[REQUEST_ID_HEADER], env.TRUST_PROXY_REQUEST_ID),
  });
  const fastify = adapter.getInstance();
  fastify.addHook('onRequest', (request, reply, done) => {
    void reply.header(REQUEST_ID_HEADER, request.id);
    done();
  });

  // Graceful drain: once close() starts, Fastify refuses new requests with 503 and waits for
  // in-flight ones. Responses sent meanwhile carry `Connection: close`, so keep-alive sockets
  // end with them instead of holding the server open until their idle timeout.
  let closing = false;
  fastify.addHook('preClose', (done) => {
    closing = true;
    done();
  });
  fastify.addHook('onSend', (_request, reply, _payload, done) => {
    if (closing) void reply.header('connection', 'close');
    done();
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.forRoot(env, options),
    adapter,
    { bufferLogs: true },
  );
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix(API_PREFIX, { exclude: [DOCS_PATH, `${DOCS_PATH}/openapi.json`] });
  app.enableShutdownHooks();
  return app;
}
