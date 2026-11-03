import type { ProblemDetails } from '@hims/contracts';
import { PROBLEM_CONTENT_TYPE } from '@hims/contracts';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, Injectable } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { PinoLogger } from 'nestjs-pino';

import { toProblem } from './problem';

/** Logs server faults (with the original error) and sends the problem with the request id. */
export function sendProblem(
  logger: PinoLogger,
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
  problem: ProblemDetails = toProblem(error),
): void {
  if (problem.status >= 500) logger.error({ err: error }, 'request failed');
  void reply
    .status(problem.status)
    .type(PROBLEM_CONTENT_TYPE)
    .send({ ...problem, requestId: request.id });
}

/** Turns every exception that reaches Nest into an RFC 9457 problem+json response. */
@Catch()
@Injectable()
export class ProblemDetailsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    logger.setContext(ProblemDetailsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    sendProblem(
      this.logger,
      exception,
      http.getRequest<FastifyRequest>(),
      http.getResponse<FastifyReply>(),
    );
  }
}
