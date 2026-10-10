import { API_VERSION, contract, PROBLEM_CONTENT_TYPE, problemDetailsSchema } from '@hims/contracts';
import { OpenAPIGenerator } from '@orpc/openapi';
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4';
import { z } from 'zod';

type OpenAPIDocument = Awaited<ReturnType<OpenAPIGenerator['generate']>>;

const PROBLEM_REF = '#/components/schemas/ProblemDetails';

/** OpenAPI 3.1 document for the whole contract; every operation documents problem+json errors. */
export async function generateOpenApiDocument(release: string): Promise<OpenAPIDocument> {
  const generator = new OpenAPIGenerator({ schemaConverters: [new ZodToJsonSchemaConverter()] });
  const document = await generator.generate(contract, {
    info: { title: 'HIMS API', version: release },
    servers: [{ url: `/api/${API_VERSION}` }],
  });

  document.components = {
    ...document.components,
    schemas: {
      ...document.components?.schemas,
      ProblemDetails: z.toJSONSchema(problemDetailsSchema) as object,
    },
  };
  for (const item of Object.values(document.paths ?? {})) {
    if (!item) continue;
    for (const operation of [item.get, item.post, item.put, item.patch, item.delete]) {
      if (!operation) continue;
      operation.responses = {
        ...operation.responses,
        default: {
          description: 'RFC 9457 problem details',
          content: { [PROBLEM_CONTENT_TYPE]: { schema: { $ref: PROBLEM_REF } } },
        },
      };
    }
  }
  return document;
}
