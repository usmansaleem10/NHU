import { Controller, Get, Header, Inject, Optional } from '@nestjs/common';

import type { Env } from '../config/env';
import { ENV } from '../config/env.token';
import type { OpenAPIDocument, OpenApiGenerator } from './openapi';
import { generateOpenApiDocument } from './openapi';

export const DOCS_PATH = 'api/docs';
/** Optional override of the OpenAPI generator (tests). */
export const OPENAPI_GENERATOR = Symbol('OPENAPI_GENERATOR');
const SPEC_PATH = `/${DOCS_PATH}/openapi.json`;

/** Pinned Scalar bundle and its SRI hash (sha384 of the exact npm/jsDelivr file). */
export const SCALAR_SCRIPT_URL =
  'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.70.0/dist/browser/standalone.js';
export const SCALAR_INTEGRITY =
  'sha384-C7UjpUKXe2xpcKhU1f0d6mVriqbtN0f9QsgEdE8Q5cSQdY0Z+u/mCdhfxX6v/Cl/';

// Only the pinned bundle may run; it may only fetch the spec from this origin. Scalar injects
// its own <style> tags, hence style-src 'unsafe-inline' (styles only, never scripts).
const REFERENCE_PAGE_CSP = [
  "default-src 'none'",
  `script-src ${SCALAR_SCRIPT_URL}`,
  "style-src 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

// The config element is JSON, not script, so it needs no CSP allowance.
const REFERENCE_PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>HIMS API reference</title>
  </head>
  <body>
    <script id="api-reference" type="application/json" data-url="${SPEC_PATH}"></script>
    <script src="${SCALAR_SCRIPT_URL}" integrity="${SCALAR_INTEGRITY}" crossorigin="anonymous"></script>
  </body>
</html>
`;

/**
 * GET /api/docs (HTML) and /api/docs/openapi.json, outside the /api/v1 prefix. Registered only
 * when API_DOCS_ENABLED=true (see AppModule), independent of NODE_ENV.
 */
@Controller(DOCS_PATH)
export class DocsController {
  private document: Promise<OpenAPIDocument> | undefined;

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Optional()
    @Inject(OPENAPI_GENERATOR)
    private readonly generate: OpenApiGenerator = generateOpenApiDocument,
  ) {}

  @Get()
  @Header('content-type', 'text/html; charset=utf-8')
  @Header('content-security-policy', REFERENCE_PAGE_CSP)
  @Header('x-content-type-options', 'nosniff')
  page(): string {
    return REFERENCE_PAGE;
  }

  @Get('openapi.json')
  @Header('x-content-type-options', 'nosniff')
  openApi(): Promise<OpenAPIDocument> {
    // Cache the generated document, but never a failure: the next request retries.
    this.document ??= this.generate(this.env.APP_RELEASE).catch((error: unknown) => {
      this.document = undefined;
      throw error;
    });
    return this.document;
  }
}
