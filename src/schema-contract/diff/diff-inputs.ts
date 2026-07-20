// T025-F2: Diff InputObjectTypeDefinition nodes — tracks new input types and new
// fields on existing input types as ADDITIVE; removed input types / fields as
// BREAKING. Input fields carry no @deprecated directives (the spec forbids it),
// so deprecation logic is intentionally omitted here.
import { InputValueDefinitionNode, TypeNode } from 'graphql';
import { ChangeType, ElementType } from '../model';
import { unionKeys } from './cleanup';
import { DiffContext, IndexedSchema, pushEntry } from './diff-core';

function printTypeNode(node: TypeNode): string {
  switch (node.kind) {
    case 'NamedType':
      return node.name.value;
    case 'NonNullType':
      return printTypeNode(node.type) + '!';
    case 'ListType':
      return '[' + printTypeNode(node.type) + ']';
    default:
      return 'UNKNOWN';
  }
}

export function diffInputs(
  oldIdx: IndexedSchema,
  newIdx: IndexedSchema,
  ctx: DiffContext
) {
  const allNames = unionKeys(oldIdx.inputs, newIdx.inputs);
  for (const name of allNames) {
    const o = oldIdx.inputs[name];
    const n = newIdx.inputs[name];

    if (!o && n) {
      // New input type added — ADDITIVE
      pushEntry(ctx, {
        element: name,
        elementType: ElementType.TYPE,
        changeType: ChangeType.ADDITIVE,
        detail: `Input type added: ${name}`,
      });
      continue;
    }

    if (o && !n) {
      // Input type removed — BREAKING (any consumer may rely on it)
      pushEntry(ctx, {
        element: name,
        elementType: ElementType.TYPE,
        changeType: ChangeType.BREAKING,
        detail: `Input type removed: ${name}`,
      });
      continue;
    }

    if (o && n) {
      const oldFields =
        o.fields?.reduce<Record<string, InputValueDefinitionNode>>((m, f) => {
          m[f.name.value] = f;
          return m;
        }, {}) ?? {};
      const newFields =
        n.fields?.reduce<Record<string, InputValueDefinitionNode>>((m, f) => {
          m[f.name.value] = f;
          return m;
        }, {}) ?? {};

      const fieldNames = new Set([
        ...Object.keys(oldFields),
        ...Object.keys(newFields),
      ]);

      for (const fname of fieldNames) {
        const of = oldFields[fname];
        const nf = newFields[fname];
        const key = `${name}.${fname}`;

        if (!of && nf) {
          // New field on existing input type — ADDITIVE when optional (nullable),
          // BREAKING when required (NonNull), because existing callers omit it.
          const isRequired = nf.type.kind === 'NonNullType';
          pushEntry(ctx, {
            element: key,
            elementType: ElementType.FIELD,
            changeType: isRequired ? ChangeType.BREAKING : ChangeType.ADDITIVE,
            detail: isRequired
              ? `Input field added (required — breaking for callers): ${key} : ${printTypeNode(nf.type)}`
              : `Input field added: ${key} : ${printTypeNode(nf.type)}`,
          });
          continue;
        }

        if (of && !nf) {
          // Field removed from input type — BREAKING (producers / callers may rely on it)
          pushEntry(ctx, {
            element: key,
            elementType: ElementType.FIELD,
            changeType: ChangeType.BREAKING,
            detail: `Input field removed: ${key}`,
          });
          continue;
        }

        if (of && nf) {
          const oldTypeStr = printTypeNode(of.type);
          const newTypeStr = printTypeNode(nf.type);
          if (oldTypeStr !== newTypeStr) {
            pushEntry(ctx, {
              element: key,
              elementType: ElementType.FIELD,
              changeType: ChangeType.BREAKING,
              detail: `Input field type changed: ${key} ${oldTypeStr} -> ${newTypeStr}`,
            });
          }
          // Description-only change is INFO
          const oldDesc = of.description?.value ?? '';
          const newDesc = nf.description?.value ?? '';
          if (oldDesc !== newDesc) {
            pushEntry(ctx, {
              element: key,
              elementType: ElementType.FIELD,
              changeType: ChangeType.INFO,
              detail: `Description changed for input field ${key}`,
            });
          }
        }
      }
    }
  }
}
