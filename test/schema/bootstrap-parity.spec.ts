// Remove the `@ts-nocheck` at the top of the file

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { printSchema, parse, print, buildSchema, GraphQLSchema } from 'graphql';
import { existsSync, mkdtempSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { AppModule } from '@src/app.module';
import { SchemaBootstrapModule } from '@src/schema-bootstrap/module.schema-bootstrap';
import { Type } from '@nestjs/common';

function normalizeSDL(schema: GraphQLSchema): string {
  const rawSDL = printSchema(schema);
  const parsed = parse(rawSDL, { noLocation: true });
  return print(parsed).trim();
}

function countTypes(sdl: string): number {
  const schema = buildSchema(sdl);
  return Object.keys(schema.getTypeMap())
    .filter(name => !name.startsWith('__'))
    .length;
}

async function captureSchema(
  moduleRef: Type<any>
): Promise<{ sdl: string; durationMs: number; typeCount: number }> {
  const startedAt = Date.now();
  const app = await NestFactory.createApplicationContext(moduleRef, {
    logger: false,
  });
  try {
    // …
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { printSchema, parse, print, buildSchema } from 'graphql';
import { existsSync, mkdtempSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { AppModule } from '@src/app.module';
import { SchemaBootstrapModule } from '@src/schema-bootstrap/module.schema-bootstrap';

/**
 * @param {import('graphql').GraphQLSchema} schema
 */
function normalizeSDL(schema) {
  const rawSDL = printSchema(schema);
  const parsed = parse(rawSDL, { noLocation: true });
  return print(parsed).trim();
}

/**
 * @param {string} sdl
 */
function countTypes(sdl) {
  const schema = buildSchema(sdl);
  return Object.keys(schema.getTypeMap()).filter(name => !name.startsWith('__'))
    .length;
}

/**
 * @param {Parameters<typeof NestFactory.createApplicationContext>[0]} moduleRef
 * @returns {Promise<{sdl: string; durationMs: number; typeCount: number}>}
 */
async function captureSchema(moduleRef) {
  const startedAt = Date.now();
  const app = await NestFactory.createApplicationContext(moduleRef, {
    logger: false,
  });
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

describe('Schema bootstrap parity', () => {
  /** @type {(() => void) | undefined} */
  let cleanupTlsFile;

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
      const tlsPath = process.env.WINGBACK_TLS_CERT_PATH;
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

  jest.setTimeout(45000);

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
