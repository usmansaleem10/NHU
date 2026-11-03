import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';

import { loadEnv } from './config/env';
import { createApp } from './create-app';

/** Validates the environment (throwing before anything starts) and starts listening. */
export async function bootstrap(
  source: Readonly<Record<string, string | undefined>>,
): Promise<NestFastifyApplication> {
  const env = loadEnv(source);
  const app = await createApp(env);
  await app.listen({ port: env.PORT, host: env.HOST });
  app.get(Logger).log(`API listening on ${await app.getUrl()}`, 'Bootstrap');
  return app;
}
