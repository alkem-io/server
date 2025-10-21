import { FieldDefinitionNode, TypeNode } from 'graphql';
import { DiffContext, pushEntry, IndexedSchema } from './diff-core';
import { unionKeys } from './cleanup';
import { ElementType, ChangeType } from '../model';
import {
  getDeprecationDirective,
  parseDeprecationReason,
} from '../deprecation/parser';

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

function isNonNull(node: TypeNode): boolean {
  return node.kind === 'NonNullType';
}

export function diffTypes(
  oldIdx: IndexedSchema,
  newIdx: IndexedSchema,
  ctx: DiffContext
) {
  const allNames = unionKeys(oldIdx.types, newIdx.types);
  for (const name of allNames) {
    const o = oldIdx.types[name];
    const n = newIdx.types[name];
    if (!o && n) {
      pushEntry(ctx, {
        element: name,
        elementType: ElementType.TYPE,
        changeType: ChangeType.ADDITIVE,
        detail: `Type added: ${name}`,
      });
      continue;
    }
    if (o && !n) {
      pushEntry(ctx, {
        element: name,
        elementType: ElementType.TYPE,
        changeType: ChangeType.BREAKING,
        detail: `Type removed: ${name}`,
      });
      continue;
    }
    if (o && n) {
      const oldFields =
        o.fields?.reduce<Record<string, FieldDefinitionNode>>((m, f) => {
          m[f.name.value] = f;
          return m;
        }, {}) || {};
      const newFields =
        n.fields?.reduce<Record<string, FieldDefinitionNode>>((m, f) => {
          m[f.name.value] = f;
          return m;
        }, {}) || {};
      const fieldNames = new Set([
        ...Object.keys(oldFields),
        ...Object.keys(newFields),
      ]);
      for (const fname of fieldNames) {
        const of = oldFields[fname];
        const nf = newFields[fname];
        const key = `${name}.${fname}`;
        if (!of && nf) {
          pushEntry(ctx, {
            element: key,
            elementType: ElementType.FIELD,
            changeType: ChangeType.ADDITIVE,
            detail: `Field added: ${key} : ${printTypeNode(nf.type)}`,
          });
          continue;
        }
        if (of && !nf) {
          const dep = getDeprecationDirective(of);
          if (!dep) {
            pushEntry(ctx, {
              element: key,
              elementType: ElementType.FIELD,
              changeType: ChangeType.BREAKING,
              detail: `Field removed without prior deprecation: ${key}`,
            });
            continue;
          }
          const parsed = parseDeprecationReason(dep.reason);
          if (!parsed.formatValid) {
            pushEntry(ctx, {
              element: key,
              elementType: ElementType.FIELD,
              changeType: ChangeType.BREAKING,
              detail: `Field removed but deprecation reason invalid: ${key}`,
              deprecationFormatValid: false,
            });
            continue;
          }
          pushEntry(ctx, {
            element: key,
            elementType: ElementType.FIELD,
            changeType: ChangeType.BREAKING,
            detail: `Field removed (lifecycle validation deferred): ${key}`,
            deprecationFormatValid: true,
            removeAfter: parsed.removeAfter,
          });
          continue;
        }
        if (of && nf) {
          const oldTypeStr = printTypeNode(of.type);
          const newTypeStr = printTypeNode(nf.type);
          const oldDep = getDeprecationDirective(of);
          const newDep = getDeprecationDirective(nf);
          if (!oldDep && newDep) {
            const parsed = parseDeprecationReason(
              newDep.reason,
              new Date(),
              new Date()
            );
            if (parsed.formatValid) {
              pushEntry(ctx, {
                element: key,
                elementType: ElementType.FIELD,
                changeType: ChangeType.DEPRECATED,
                detail: `Field deprecated with removal target ${parsed.removeAfter}`,
                deprecationFormatValid: true,
                removeAfter: parsed.removeAfter,
              });
            } else {
              pushEntry(ctx, {
                element: key,
                elementType: ElementType.FIELD,
                changeType: ChangeType.INVALID_DEPRECATION_FORMAT,
                detail: `Invalid deprecation reason format on field ${key}`,
                deprecationFormatValid: false,
              });
            }
          }
          if (oldTypeStr !== newTypeStr) {
            const oldNonNull = isNonNull(of.type);
            const newNonNull = isNonNull(nf.type);
            let changeType: ChangeType = ChangeType.BREAKING;
            if (oldNonNull && !newNonNull) changeType = ChangeType.INFO;
            pushEntry(ctx, {
              element: key,
              elementType: ElementType.FIELD,
              changeType,
              detail: `Field type changed: ${oldTypeStr} -> ${newTypeStr}`,
            });
            continue;
          }
          const oldDesc = of.description?.value || '';
          const newDesc = nf.description?.value || '';
          if (oldDesc !== newDesc) {
            pushEntry(ctx, {
              element: key,
              elementType: ElementType.FIELD,
              changeType: ChangeType.INFO,
              detail: `Description changed for ${key}`,
            });
          }
        }
      }
    }
  }
}
