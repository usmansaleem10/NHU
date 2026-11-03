import { PROBLEM_CONTENT_TYPE, problemDetailsSchema } from '@hims/contracts';
import { Logger, Module } from '@nestjs/common';
import { ORPCModule } from '@orpc/nest';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { toProblem } from '../errors/problem';

const logger = new Logger('Contract');

/**
 * Wires oRPC's Nest integration: routes declared with `@Implement(contract.x)` decode and
 * validate input/output against the shared Zod contract, and every failure leaves as the same
 * RFC 9457 problem+json the global exception filter produces.
 */
@Module({
  imports: [
    ORPCModule.forRoot({
      // Runs for every failed procedure; the original error is the ORPCError's cause.
      customErrorResponseBodyEncoder: (error) => {
        const problem = toProblem(error);
        if (problem.status >= 500) logger.error({ err: error.cause ?? error }, 'request failed');
        return problem;
      },
      // oRPC would answer with the ORPCError's status and application/json; send the problem's.
      sendResponseInterceptors: [
        async (options) => {
          const { standardResponse } = options;
          if (standardResponse.status < 400) return options.next();
          const request = options.request as FastifyRequest;
          const reply = options.response as FastifyReply;
          const parsed = problemDetailsSchema.safeParse(standardResponse.body);
          const problem = parsed.success ? parsed.data : toProblem(standardResponse.body);
          await reply
            .status(problem.status)
            .type(PROBLEM_CONTENT_TYPE)
            .send({ ...problem, requestId: request.id });
          return undefined;
        },
      ],
    }),
  ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest modules are decorator-only classes
export class ContractModule {}
