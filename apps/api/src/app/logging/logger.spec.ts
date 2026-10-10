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
        req: { headers: { authorization: 'Bearer abc.def', cookie: 'sid=s3cr3t' } },
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
