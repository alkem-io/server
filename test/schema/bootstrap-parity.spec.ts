import { vi } from 'vitest';
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { printSchema, parse, print, buildSchema, GraphQLSchema } from 'graphql';
import { existsSync, mkdtempSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { AppModule } from '@src/app.module';
import { SchemaBootstrapModule } from '@src/schema-bootstrap/module.schema-bootstrap';
import { Type } from '@nestjs/common';
import { IS_SCHEMA_BOOTSTRAP } from '@common/constants';
import {
  DataSourceStubProvider,
  EntityManagerStubProvider,
} from '@src/schema-bootstrap/stubs/db.stub';
import { CacheStubProvider } from '@src/schema-bootstrap/stubs/cache.stub';

function normalizeSDL(schema: GraphQLSchema): string {
  const rawSDL = printSchema(schema);
  const parsed = parse(rawSDL, { noLocation: true });
  return print(parsed).trim();
}

function countTypes(sdl: string): number {
  const schema = buildSchema(sdl);
  return Object.keys(schema.getTypeMap()).filter(name => !name.startsWith('__'))
    .length;
}

async function captureSchema(
  moduleRef: Type<any>
): Promise<{ sdl: string; durationMs: number; typeCount: number }> {
  const startedAt = Date.now();

  const moduleBuilder = Test.createTestingModule({
    imports: [moduleRef],
  })
    .overrideProvider(IS_SCHEMA_BOOTSTRAP)
    .useValue(true);

  // When testing AppModule, mock out heavy infrastructure to prevent leaks and speed up tests
  if (moduleRef === AppModule) {
    moduleBuilder
      .overrideProvider('DataSource')
      .useValue(DataSourceStubProvider.useValue)
      .overrideProvider('EntityManager')
      .useValue(EntityManagerStubProvider.useValue)
      .overrideProvider('CACHE_MANAGER')
      .useValue(CacheStubProvider.useValue);
  }

  const app = await moduleBuilder.compile();
  // Initialize the module (triggers onModuleInit, etc.)
  await app.init();

  try {
    const host = app.get(GraphQLSchemaHost, { strict: false });
    if (!host?.schema) {
      throw new Error('GraphQL schema is not available');
    }
    const sdl = normalizeSDL(host.schema);
    return {
      sdl,
      durationMs: Date.now() - startedAt,
      typeCount: countTypes(sdl),
    };
  } finally {
    await app.close();
  }
}

// TODO: This test is skipped in Vitest due to the "Duplicate graphql modules" issue
// when two NestJS apps are instantiated in the same test. This works in Jest but
// requires additional Vitest configuration or workaround.
// See: https://github.com/vitest-dev/vitest/issues/2073
describe.skip('Schema bootstrap parity', () => {
  let cleanupTlsFile: (() => void) | undefined;

  beforeAll(() => {
    if (!process.env.WINGBACK_TLS_CERT_PATH) {
      const tempDir = mkdtempSync(join(tmpdir(), 'schema-parity-'));
      const tlsPath = join(tempDir, 'tls.crt');
      writeFileSync(tlsPath, '');
      process.env.WINGBACK_TLS_CERT_PATH = tlsPath;
      cleanupTlsFile = () => {
        if (existsSync(tlsPath)) {
          unlinkSync(tlsPath);
        }
      };
    } else if (!existsSync(process.env.WINGBACK_TLS_CERT_PATH)) {
      const tlsPath = process.env.WINGBACK_TLS_CERT_PATH as string;
      writeFileSync(tlsPath, '');
      cleanupTlsFile = () => {
        if (existsSync(tlsPath)) {
          unlinkSync(tlsPath);
        }
      };
    }
  });

  afterAll(() => {
    cleanupTlsFile?.();
  });

  vi.setConfig({ testTimeout: 45000 });

  it('emits identical SDL and delivers faster cold start', async () => {
    const light = await captureSchema(SchemaBootstrapModule);
    const full = await captureSchema(AppModule);

    if (light.sdl !== full.sdl) {
      let idx = 0;
      while (idx < light.sdl.length && idx < full.sdl.length) {
        if (light.sdl[idx] !== full.sdl[idx]) break;
        idx++;
      }
      const contextStart = Math.max(0, idx - 80);
      const contextLight = light.sdl.slice(contextStart, idx + 80);
      const contextFull = full.sdl.slice(contextStart, idx + 80);
      console.error(
        'SDL mismatch context:\n--- Light ---\n' +
          contextLight +
          '\n--- Full ---\n' +
          contextFull
      );
    }

    expect(light.sdl).toBe(full.sdl);
    expect(light.typeCount).toBe(full.typeCount);
    expect(light.durationMs).toBeLessThanOrEqual(2000);
    expect(full.durationMs).toBeLessThan(10000);
  });
});
