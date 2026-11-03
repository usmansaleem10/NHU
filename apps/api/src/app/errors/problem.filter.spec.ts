import { Body, Controller, Get, Module, Post } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { loadEnv } from '../config/env';
import { createApp } from '../create-app';
import { NotFoundError } from './domain-error';

@Controller('probe')
class ProbeController {
  @Get('missing-patient')
  missingPatient(): never {
    throw new NotFoundError('patient.not_found', 'Patient not found');
  }

  @Get('crash')
  crash(): never {
    throw new Error('connect ECONNREFUSED 10.0.0.5:5432');
  }

  @Post('echo')
  echo(@Body() body: unknown): unknown {
    return body;
  }
}

@Module({ controllers: [ProbeController] })
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest modules are decorator-only classes
class ProbeModule {}

const logs: string[] = [];
let app: NestFastifyApplication;

beforeAll(async () => {
  app = await createApp(loadEnv({ NODE_ENV: 'test' }), {
    imports: [ProbeModule],
    logDestination: { write: (line: string) => logs.push(line) },
  });
  await app.init();
});

afterAll(async () => {
  await app.close();
});

describe('problem+json responses', () => {
  it('maps a DomainError thrown by a controller and tags it with the request id', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/probe/missing-patient',
    });

    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(response.json()).toEqual({
      type: 'urn:hims:problem:not-found',
      title: 'Not found',
      status: 404,
      code: 'patient.not_found',
      detail: 'Patient not found',
      requestId: response.headers['x-request-id'],
    });
  });

  it('answers unknown routes with problem+json', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/nope' });

    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(response.json()).toMatchObject({
      status: 404,
      requestId: response.headers['x-request-id'],
    });
  });

  it('keeps query-string PII out of error responses', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/nope?cnic=35202-1234567-1&phone=03001234567',
    });

    expect(response.statusCode).toBe(404);
    expect(response.body).not.toContain('35202-1234567-1');
    expect(response.body).not.toContain('03001234567');
  });

  it('answers malformed JSON bodies with a 400 problem', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/probe/echo',
      headers: { 'content-type': 'application/json' },
      payload: '{"name": ',
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(response.json()).toMatchObject({
      status: 400,
      requestId: response.headers['x-request-id'],
    });
  });

  it('hides unexpected failures from the client but logs them with the request id', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/probe/crash',
    });

    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain('ECONNREFUSED');
    const errorLog = logs
      .map((line) => JSON.parse(line) as { level: number; req?: { id?: string }; err?: unknown })
      .find((record) => record.level >= 50 && record.req?.id === response.headers['x-request-id']);
    expect(JSON.stringify(errorLog?.err)).toContain('ECONNREFUSED');
  });
});
