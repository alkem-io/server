import { createHash, randomUUID } from 'crypto';
import {
  DocumentNode,
  EnumTypeDefinitionNode,
  Kind,
  ObjectTypeDefinitionNode,
  parse,
  ScalarTypeDefinitionNode,
} from 'graphql';
import {
  ChangeEntry,
  ChangeReport,
  ChangeType,
  ClassificationCount,
  DeprecationEntry,
  ElementType,
} from '../model';

export interface IndexedSchema {
  doc: DocumentNode;
  types: Record<string, ObjectTypeDefinitionNode>;
  enums: Record<string, EnumTypeDefinitionNode>;
  scalars: Record<string, ScalarTypeDefinitionNode>;
  rawSDL: string;
}

export function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export function indexSDL(sdl: string): IndexedSchema {
  // Allow diffing against an "empty schema" by synthesizing an empty document when SDL is blank.
  const doc: DocumentNode =
    sdl.trim().length === 0
      ? { kind: Kind.DOCUMENT, definitions: [] }
      : parse(sdl, { noLocation: true });
  const types: Record<string, ObjectTypeDefinitionNode> = {};
  const enums: Record<string, EnumTypeDefinitionNode> = {};
  const scalars: Record<string, ScalarTypeDefinitionNode> = {};
  for (const def of doc.definitions) {
    switch (def.kind) {
      case 'ObjectTypeDefinition':
        if (def.name?.value) types[def.name.value] = def;
        break;
      case 'EnumTypeDefinition':
        if (def.name?.value) enums[def.name.value] = def;
        break;
      case 'ScalarTypeDefinition':
        if (def.name?.value) scalars[def.name.value] = def;
        break;
      default:
        break;
    }
  }
  return { doc, types, enums, scalars, rawSDL: sdl };
}

export function emptyCounts(): ClassificationCount {
  return {
    additive: 0,
    deprecated: 0,
    breaking: 0,
    prematureRemoval: 0,
    invalidDeprecation: 0,
    deprecationGrace: 0,
    info: 0,
    baseline: 0,
  };
}

export interface DiffContext {
  entries: ChangeEntry[];
  counts: ClassificationCount;
  deprecations: DeprecationEntry[];
  previousDeprecations: Map<string, DeprecationEntry>;
  headCommit?: string;
  scalarEvaluations?: any[];
}

export function createDiffContext(
  prev: DeprecationEntry[] = [],
  headCommit?: string
): DiffContext {
  const map = new Map<string, DeprecationEntry>();
  prev.forEach(d => map.set(d.element, d));
  return {
    entries: [],
    counts: emptyCounts(),
    deprecations: [],
    previousDeprecations: map,
    headCommit,
  };
}

export function pushEntry(ctx: DiffContext, entry: Omit<ChangeEntry, 'id'>) {
  ctx.entries.push({ id: randomUUID(), ...entry });
  switch (entry.changeType) {
    case ChangeType.ADDITIVE:
      ctx.counts.additive++;
      break;
    case ChangeType.DEPRECATED:
      ctx.counts.deprecated++;
      break;
    case ChangeType.BREAKING:
      ctx.counts.breaking++;
      break;
    case ChangeType.PREMATURE_REMOVAL:
      ctx.counts.prematureRemoval++;
      break;
    case ChangeType.INVALID_DEPRECATION_FORMAT:
      ctx.counts.invalidDeprecation++;
      break;
    case ChangeType.DEPRECATION_GRACE:
      if (typeof ctx.counts.deprecationGrace === 'number') {
        ctx.counts.deprecationGrace++;
      }
      break;
    case ChangeType.INFO:
      ctx.counts.info++;
      break;
    default:
      break;
  }
}

export function baselineReport(newSDL: string): ChangeReport {
  return {
    snapshotId: sha256(newSDL),
    baseSnapshotId: null,
    generatedAt: new Date().toISOString(),
    classifications: emptyCounts(),
    entries: [
      {
        id: randomUUID(),
        element: 'SCHEMA',
        elementType: ElementType.TYPE,
        changeType: ChangeType.BASELINE,
        detail: 'Initial baseline snapshot created',
      },
    ],
    overrideApplied: false,
  };
}
