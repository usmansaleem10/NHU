import { contract } from '@hims/contracts';
import { Controller } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { ServiceUnavailableError } from '../errors/domain-error';
import { ReadinessRegistry } from './readiness.registry';

/** GET /api/v1/health (liveness) and /api/v1/health/ready (readiness) for the orchestrator. */
@Controller()
export class HealthController {
  constructor(private readonly readiness: ReadinessRegistry) {}

  @Implement(contract.health.liveness)
  liveness() {
    return implement(contract.health.liveness).handler(() => ({ status: 'ok' as const }));
  }

  @Implement(contract.health.readiness)
  ready() {
    return implement(contract.health.readiness).handler(async () => {
      const report = await this.readiness.run();
      if (report.status !== 'ok') {
        throw new ServiceUnavailableError('health.not_ready', 'A dependency is not ready', {
          extensions: { checks: report.checks },
        });
      }
      return report;
    });
  }
}
