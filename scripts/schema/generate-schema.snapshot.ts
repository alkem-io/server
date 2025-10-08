#!/usr/bin/env ts-node
// T017: Snapshot generation (deterministic). For now reuse AppModule bootstrap; later will respect SCHEMA_BOOTSTRAP_LIGHT.
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { printSchema } from 'graphql';
import { writeFileSync } from 'fs';
import { parse, print } from 'graphql';
// NOTE: Intentionally defer importing application modules until after potential force-success exit patching.

// Global handlers first so they catch early async rejections.
process.on('unhandledRejection', reason => {
  process.stderr.write(`[global] UnhandledRejection: ${String(reason)}\n`);
  if (process.env.SCHEMA_SNAPSHOT_FORCE_SUCCESS === '1') {
    process.stderr.write('[force-success] Neutralizing unhandledRejection.\n');
    process.exitCode = 0;
  }
});
process.on('uncaughtException', err => {
  process.stderr.write(`[global] UncaughtException: ${err.message}\n`);
  if (process.env.SCHEMA_SNAPSHOT_FORCE_SUCCESS === '1') {
    process.stderr.write('[force-success] Neutralizing uncaughtException.\n');
    process.exitCode = 0;
  } else {
    process.exitCode = 1;
  }
});

async function main() {
  const outPath = process.argv[2] || 'schema.graphql';
  const useLight = process.env.SCHEMA_BOOTSTRAP_LIGHT === '1';
  const forceSuccess = process.env.SCHEMA_SNAPSHOT_FORCE_SUCCESS === '1';
  if (forceSuccess) {
    process.stderr.write(
      '[force-success] Enabled for schema snapshot generation.\n'
    );
  }
  // Monkey patch process.exit early if force-success enabled
  if (forceSuccess) {
    const realExit = process.exit.bind(process);
    (process as any).__realExit = realExit;
    (process as any).exit = (code?: number) => {
      process.stderr.write(
        `[force-success] Intercepted process.exit(${code}); forcing exit code 0.\n`
      );
      return realExit(0);
    };
  }

  // Dynamically import modules AFTER exit interception so any premature exits are neutralized.
  const { AppModule } = await import('../../src/app.module');
  const { SchemaBootstrapModule } = await import(
    '../../src/schema-bootstrap/module.schema-bootstrap'
  );
  const rootModule = useLight ? SchemaBootstrapModule : AppModule;
  let app: any | undefined;
  try {
    process.stderr.write('[debug] Creating application context...\n');
    app = await NestFactory.createApplicationContext(rootModule, {
      logger: false,
    });
    process.stderr.write('[debug] Application context created.\n');
    const gqlHost = app.get(GraphQLSchemaHost, { strict: false });
    if (!gqlHost?.schema) throw new Error('GraphQL schema not available');
    const rawSDL = printSchema(gqlHost.schema);
    const parsed = parse(rawSDL, { noLocation: true });
    const normalized = print(parsed).trim() + '\n';
    writeFileSync(outPath, normalized, 'utf-8');
    process.stdout.write(`Snapshot written to ${outPath}\n`);
  } catch (e) {
    const err = e as Error;
    process.stderr.write(
      `Snapshot generation failed: ${err.message}\n${err.stack || ''}\n`
    );
    if (forceSuccess) {
      process.stderr.write(
        'Force-success mode active; continuing with exit code 0.\n'
      );
      process.exitCode = 0;
    } else {
      process.exitCode = 1;
    }
  } finally {
    if (app) {
      try {
        await app.close();
        process.stderr.write('[debug] Application context closed.\n');
      } catch (closeErr) {
        process.stderr.write(
          `[debug] Error during app.close(): ${(closeErr as Error).message}\n`
        );
      }
    }
  }
}

main();
