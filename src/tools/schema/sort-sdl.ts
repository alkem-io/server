#!/usr/bin/env ts-node
// Deterministic SDL sorting utility.
// Implements stable ordering:
// 1. Definition group order (scalars, enums, interfaces, types, inputs, unions, directives, schema)
// 2. Within each group alphabetical by name
// 3. For object/interface/input: fields alphabetical
// 4. For enums: values alphabetical
// 5. For unions: member types alphabetical
// 6. Preserve descriptions + directives attached to definitions / fields.

import { readFileSync, writeFileSync } from 'node:fs';
import {
  DefinitionNode,
  DocumentNode,
  EnumTypeDefinitionNode,
  FieldDefinitionNode,
  InputObjectTypeDefinitionNode,
  InputValueDefinitionNode,
  InterfaceTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  parse,
  print,
  UnionTypeDefinitionNode,
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
    // Fallback: by name if present, else kind
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

function main() {
  const inPath = process.argv[2];
  const outPath = process.argv[3] || inPath;
  if (!inPath) {
    console.error('Usage: sort-sdl <inputSDL> [outputSDL]');
    process.exit(1);
  }
  const sdl = readFileSync(inPath, 'utf-8');
  let doc: DocumentNode;
  try {
    doc = parse(sdl, { noLocation: false });
  } catch (e) {
    console.error('Failed to parse SDL:', (e as Error).message);
    process.exit(2);
  }
  const transformed = transform(doc);
  const printed = print(transformed).trim() + '\n';
  writeFileSync(outPath, printed, 'utf-8');
  process.stdout.write(`Sorted SDL written to ${outPath}\n`);
}

main();
