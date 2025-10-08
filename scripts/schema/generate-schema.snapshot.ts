#!/usr/bin/env ts-node
// T017: Snapshot generation (deterministic). For now reuse AppModule bootstrap; later will respect SCHEMA_BOOTSTRAP_LIGHT.
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { printSchema } from 'graphql';
import { writeFileSync } from 'fs';
import { parse, print } from 'graphql';
import { AppModule } from '../../src/app.module';
import { SchemaBootstrapModule } from '../../src/schema-bootstrap/module.schema-bootstrap';

async function main() {
  const outPath = process.argv[2] || 'schema.graphql';
  const useLight = process.env.SCHEMA_BOOTSTRAP_LIGHT === '1';
  const rootModule = useLight ? SchemaBootstrapModule : AppModule;
  const app = await NestFactory.createApplicationContext(rootModule, {
    logger: false,
  });
  try {
    const gqlHost = app.get(GraphQLSchemaHost, { strict: false });
    if (!gqlHost?.schema) throw new Error('GraphQL schema not available');
    const rawSDL = printSchema(gqlHost.schema);
    // Basic deterministic normalization via parse+print (ordering managed by existing GraphQL config sortSchema)
    const parsed = parse(rawSDL, { noLocation: true });
    const normalized = print(parsed).trim() + '\n';
    writeFileSync(outPath, normalized, 'utf-8');
    process.stdout.write(`Snapshot written to ${outPath}\n`);
  } catch (e) {
    process.stderr.write(
      `Snapshot generation failed: ${(e as Error).message}\n`
    );
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main();
