import { pino } from 'pino';
import { describe, expect, it } from 'vitest';

import { createLoggerOptions, REDACTED } from './logger';

function capture() {
  const lines: string[] = [];
  const logger = pino(createLoggerOptions('info'), { write: (line: string) => lines.push(line) });
  const records = () => lines.map((line) => JSON.parse(line) as Record<string, unknown>);
  return { logger, records, raw: () => lines.join('') };
}

const CNIC = '35202-1234567-1';
const PHONE = '+923001234567';

describe('logger PII redaction', () => {
  it('writes structured JSON records', () => {
    const { logger, records } = capture();

    logger.info({ event: 'boot' }, 'started');

    expect(records()[0]).toMatchObject({ level: 30, event: 'boot', msg: 'started' });
  });

  it.each([
    ['cnic', { cnic: CNIC }],
    ['phone', { phone: PHONE }],
    ['mobile', { mobile: PHONE }],
    ['password', { password: 'hunter2-secret' }],
    ['token', { token: 'tok_live_abc' }],
    ['accessToken', { accessToken: 'eyJ.access' }],
    ['refreshToken', { refreshToken: 'eyJ.refresh' }],
    ['name', { name: 'Ali Raza Khan' }],
    ['email', { email: 'ali@example.pk' }],
    ['address', { address: 'House 12, Street 4, Lahore' }],
    ['dob', { dob: '1990-02-14' }],
    ['dateOfBirth', { dateOfBirth: '1990-02-14' }],
  ])('redacts a top-level %s field', (_field, payload) => {
    const { logger, raw } = capture();

    logger.info(payload, 'event');

    const [value] = Object.values(payload);
    expect(raw()).not.toContain(value);
    expect(raw()).toContain(REDACTED);
  });

  it('redacts PII nested inside objects and arrays', () => {
    const { logger, raw } = capture();

    logger.info(
      {
        patient: { cnic: CNIC, contact: { phone: PHONE } },
        guardians: [{ cnic: '42101-7654321-3' }],
      },
      'registered',
    );

    expect(raw()).not.toContain(CNIC);
    expect(raw()).not.toContain(PHONE);
    expect(raw()).not.toContain('42101-7654321-3');
  });

  it('redacts credentials in request and response headers', () => {
    const { logger, raw } = capture();

    logger.info(
      {
        req: {
          headers: {
            authorization: 'Bearer abc.def',
            cookie: 'sid=s3cr3t',
            'x-api-key': 'key-s3cr3t',
            'proxy-authorization': 'Basic s3cr3t',
          },
        },
        res: { headers: { 'set-cookie': 'sid=s3cr3t; HttpOnly' } },
      },
      'request completed',
    );

    expect(raw()).not.toContain('abc.def');
    expect(raw()).not.toContain('s3cr3t');
  });

  it('masks CNIC and phone numbers that leak into free-text messages', () => {
    const { logger, records } = capture();

    logger.warn(`lookup failed for ${CNIC} / 0300-1234567 / ${PHONE} / 3520212345671`);

    const { msg } = records()[0] as { msg: string };
    expect(msg).not.toMatch(/\d{5}-?\d{7}-?\d/);
    expect(msg).not.toMatch(/3\d{2}-?\d{7}/);
    expect(msg).toContain(REDACTED);
  });

  it('keeps non-PII numbers in messages intact', () => {
    const { logger, records } = capture();

    logger.info('processed 125 rows in 3402 ms');

    expect(records()[0]).toMatchObject({ msg: 'processed 125 rows in 3402 ms' });
  });
});

describe('logger error serialization', () => {
  it('masks PII in a Postgres unique-violation error (message, detail, stack)', () => {
    const { logger, raw } = capture();
    const pgError = Object.assign(
      new Error(`duplicate key value violates unique constraint for ${CNIC}`),
      {
        code: '23505',
        detail: 'Key (cnic)=(35202-1234567-1) already exists.',
        table: 'patients',
      },
    );

    logger.error({ err: pgError }, 'insert failed');

    expect(raw()).not.toContain(CNIC);
    expect(raw()).toContain('23505');
    expect(raw()).toContain('Key (cnic)=(');
  });

  it('masks key values that do not match a known PII pattern', () => {
    const { logger, raw } = capture();
    const pgError = Object.assign(new Error('duplicate key'), {
      detail: 'Key (email)=(ali@example.pk) already exists.',
    });

    logger.error({ err: pgError }, 'insert failed');

    expect(raw()).not.toContain('ali@example.pk');
  });

  it('drops bound query parameters from Drizzle-style errors', () => {
    const { logger, raw, records } = capture();
    const drizzleError = Object.assign(new Error('Failed query: insert into patients'), {
      query: 'insert into "patients" ("cnic", "name") values ($1, $2)',
      params: [CNIC, 'Ali Raza Khan'],
      cause: Object.assign(new Error('pool error'), { parameters: [PHONE] }),
    });

    logger.error({ err: drizzleError }, 'query failed');

    expect(raw()).not.toContain(CNIC);
    expect(raw()).not.toContain('Ali Raza Khan');
    expect(raw()).not.toContain(PHONE);
    expect(records()[0]).toMatchObject({
      err: { query: expect.stringContaining('patients') as string },
    });
  });

  it('logs the request path but never its query string', () => {
    const { logger, raw } = capture();

    logger.info({ req: { method: 'GET', url: `/api/v1/patients?cnic=${CNIC}&phone=03001234567` } });

    expect(raw()).toContain('/api/v1/patients');
    expect(raw()).not.toContain(CNIC);
    expect(raw()).not.toContain('03001234567');
  });
});
