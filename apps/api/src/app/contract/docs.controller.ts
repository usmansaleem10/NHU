import { Controller, Get, Header, Inject } from '@nestjs/common';

import type { Env } from '../config/env';
import { ENV } from '../config/env.token';
import { generateOpenApiDocument } from './openapi';

export const DOCS_PATH = 'api/docs';
const SPEC_PATH = `/${DOCS_PATH}/openapi.json`;

// Scalar API reference, pinned. The page only renders the spec served next to it.
const REFERENCE_PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>HIMS API reference</title>
  </head>
  <body>
    <script id="api-reference" data-url="${SPEC_PATH}"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.70.0"></script>
  </body>
</html>
`;

/** Served outside the /api/v1 prefix: GET /api/docs (HTML) and /api/docs/openapi.json. */
@Controller(DOCS_PATH)
export class DocsController {
  private document: ReturnType<typeof generateOpenApiDocument> | undefined;

  constructor(@Inject(ENV) private readonly env: Env) {}

  @Get()
  @Header('content-type', 'text/html; charset=utf-8')
  page(): string {
    return REFERENCE_PAGE;
  }

  @Get('openapi.json')
  openApi(): ReturnType<typeof generateOpenApiDocument> {
    this.document ??= generateOpenApiDocument(this.env.APP_RELEASE);
    return this.document;
  }
}
