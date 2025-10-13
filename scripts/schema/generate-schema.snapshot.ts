#!/usr/bin/env ts-node
// T017: Snapshot generation (deterministic). Respects SCHEMA_BOOTSTRAP_LIGHT env var when selecting the bootstrap module.
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { printSchema } from 'graphql';
import { writeFileSync } from 'fs';
import { parse, print } from 'graphql';
// NOTE: Intentionally defer importing application modules until after global handlers are registered.

// Global handlers first so they catch early async rejections.
process.on('unhandledRejection', reason => {
  process.stderr.write(`[global] UnhandledRejection: ${String(reason)}\n`);
  process.exitCode = 1;
});
process.on('uncaughtException', err => {
  process.stderr.write(`[global] UncaughtException: ${err.message}\n`);
  process.exitCode = 1;
});

async function main() {
  const outPath = process.argv[2] || 'schema.graphql';
  const useLight = process.env.SCHEMA_BOOTSTRAP_LIGHT === '1';
  const debug = process.env.SCHEMA_SNAPSHOT_DEBUG === '1';
  const realExit = process.exit.bind(process);

  // Dynamically import modules only after the global handlers and setup complete.
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
    process.exitCode = 1;
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

    // Diagnostics for potential hang: list active handles/requests AFTER app.close
    if (debug) {
      try {
        const handles = (process as any)._getActiveHandles?.() || [];
        const requests = (process as any)._getActiveRequests?.() || [];
        process.stderr.write(
          `[debug] Active handles after close: ${handles.length}, requests: ${requests.length}\n`
        );
        handles.forEach((h: any, i: number) => {
          const ctor = h && h.constructor ? h.constructor.name : typeof h;
          // Best-effort classification
          let info = '';
          if (ctor === 'Timeout') {
            info = `refed=${(h as any)._repeat ? 'interval' : 'timeout'}`;
          }
          if (ctor === 'Socket') {
            info = `writable=${(h as any).writable} readable=${(h as any).readable}`;
          }
          process.stderr.write(`[debug] Handle[${i}] ${ctor} ${info}\n`);
        });
        if (handles.length > 0) {
          process.stderr.write('[debug] Forcing real exit to avoid CI hang.\n');
        }
      } catch (diagErr) {
        process.stderr.write(
          '[debug] Failed active handle diagnostics: ' +
            (diagErr as Error).message +
            '\n'
        );
      }
    }

    // Always force a real exit to avoid lingering event-loop preventing process termination.
    try {
      // Use nextTick to allow any buffered I/O to flush.
      process.nextTick(() => realExit(process.exitCode || 0));
    } catch (exitErr) {
      process.stderr.write(
        '[debug] Failed to force real exit: ' +
          (exitErr as Error).message +
          '\n'
      );
    }
  }
}

main();
