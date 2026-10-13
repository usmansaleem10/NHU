import { Global, Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { ReadinessRegistry } from './readiness.registry';

/** Global so any infrastructure module can inject ReadinessRegistry and register its check. */
@Global()
@Module({
  controllers: [HealthController],
  providers: [ReadinessRegistry],
  exports: [ReadinessRegistry],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest modules are decorator-only classes
export class HealthModule {}
