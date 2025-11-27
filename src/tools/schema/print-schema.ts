#!/usr/bin/env ts-node
// Prints a deterministic GraphQL schema SDL.
// Uses Nest application bootstrap to build the executable schema and then
// parses & reprints through the same sorting logic as `sort-sdl.ts` for stability.
// NOTE: Requires that the GraphQL module is configured in AppModule.

import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { printSchema } from 'graphql';
import { AppModule } from '../../app.module';
import { parse, print, DocumentNode } from 'graphql';
// Reuse sorting by invoking the logic in sort-sdl via an internal function copy to avoid circular import.

// Minimal inline sorter (mirrors logic in sort-sdl.ts but scoped locally to avoid execution cost of re-reading file)
import {
  DefinitionNode,
  ObjectTypeDefinitionNode,
  InterfaceTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  EnumTypeDefinitionNode,
  UnionTypeDefinitionNode,
  FieldDefinitionNode,
  InputValueDefinitionNode,
} from 'graphql';

type AnyComposite =
  | ObjectTypeDefinitionNode
  | InterfaceTypeDefinitionNode
  | InputObjectTypeDefinitionNode;

function sortName<T extends { name?: { value: string } }>(a: T, b: T) {
  const an = a.name?.value || '';
  const bn = b.name?.value || '';
  return an.localeCompare(bn);
}

const groupRank: Record<string, number> = {
  ScalarTypeDefinition: 1,
  EnumTypeDefinition: 2,
  InterfaceTypeDefinition: 3,
  ObjectTypeDefinition: 4,
  InputObjectTypeDefinition: 5,
  UnionTypeDefinition: 6,
  DirectiveDefinition: 7,
  SchemaDefinition: 8,
};

function orderDefinitions(defs: readonly DefinitionNode[]): DefinitionNode[] {
  return [...defs].sort((a, b) => {
    const ga = groupRank[a.kind] || 99;
    const gb = groupRank[b.kind] || 99;
    if (ga !== gb) return ga - gb;
    const nameCmp = sortName(a as any, b as any);
    if (nameCmp !== 0) return nameCmp;
    return a.kind.localeCompare(b.kind);
  });
}

function sortComposite(node: AnyComposite): AnyComposite {
  if (!node.fields) return node;
  const sortedFields = [...node.fields].sort(sortName).map(field => {
    const f = field as FieldDefinitionNode | InputValueDefinitionNode;
    if ('arguments' in f) {
      const fd = f as FieldDefinitionNode;
      if (fd.arguments && fd.arguments.length > 1) {
        const newArgs = [...fd.arguments].sort(sortName);
        return { ...fd, arguments: newArgs } as typeof f;
      }
    }
    return f;
  });
  return { ...node, fields: sortedFields as any };
}

function sortEnum(node: EnumTypeDefinitionNode): EnumTypeDefinitionNode {
  if (!node.values) return node;
  return { ...node, values: [...node.values].sort(sortName) };
}

function sortUnion(node: UnionTypeDefinitionNode): UnionTypeDefinitionNode {
  if (!node.types) return node;
  return { ...node, types: [...node.types].sort(sortName) };
}

function transform(doc: DocumentNode): DocumentNode {
  const transformedDefs: DefinitionNode[] = [];
  for (const def of doc.definitions) {
    switch (def.kind) {
      case 'ObjectTypeDefinition':
      case 'InterfaceTypeDefinition':
      case 'InputObjectTypeDefinition':
        transformedDefs.push(sortComposite(def));
        break;
      case 'EnumTypeDefinition':
        transformedDefs.push(sortEnum(def));
        break;
      case 'UnionTypeDefinition':
        transformedDefs.push(sortUnion(def));
        break;
      default:
        transformedDefs.push(def);
    }
  }
  const ordered = orderDefinitions(transformedDefs);
  return { ...doc, definitions: ordered };
}

function forceExit() {
  const code = process.exitCode ?? 0;
  // Delay exit slightly so stdout/stderr flush before terminating the process.
  setImmediate(() => process.exit(code));
}

async function main() {
  const outPath = process.argv[2] || 'schema.graphql';
  try {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });

    try {
      const gqlHost = app.get(GraphQLSchemaHost, { strict: false });
      if (!gqlHost || !gqlHost.schema) {
        throw new Error('GraphQL schema not available from GraphQLSchemaHost');
      }
      const rawSDL = printSchema(gqlHost.schema);
      const parsed = parse(rawSDL, { noLocation: true });
      const transformed = transform(parsed);
      const sortedSDL = print(transformed).trim() + '\n';
      writeFileSync(outPath, sortedSDL, 'utf-8');
      process.stdout.write(`Wrote schema to ${outPath}\n`);
    } finally {
      await app.close();
    }
  } catch (err) {
    // Fallback to placeholder if something unexpected happens (keeps developer flow unblocked)
    const fallback =
      '# Schema generation failed: ' + (err as Error).message + '\n';
    writeFileSync(outPath, fallback, 'utf-8');
    process.stderr.write(`Schema generation error: ${(err as Error).stack}\n`);
    process.exitCode = 1;
  } finally {
    forceExit();
  }
}

main();
