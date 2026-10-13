import { API_VERSION, contract } from '@hims/contracts';
import { Controller, Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import type { Env } from '../config/env';
import { ENV } from '../config/env.token';

/** GET /api/v1/meta/version: which API generation and release is answering. */
@Controller()
export class MetaController {
  constructor(@Inject(ENV) private readonly env: Env) {}

  @Implement(contract.meta.version)
  version() {
    return implement(contract.meta.version).handler(() => ({
      apiVersion: API_VERSION,
      release: this.env.APP_RELEASE,
    }));
  }
}
