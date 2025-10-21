import { ScalarTypeDefinitionNode } from 'graphql';
import { DiffContext, pushEntry, IndexedSchema } from './diff-core';
import { unionKeys } from './cleanup';
import { ElementType, ChangeType } from '../model';

const JSON_TYPE_CATEGORIES = new Set([
  'string',
  'number',
  'boolean',
  'object',
  'array',
  'unknown',
]);

function extractScalarJsonType(s: ScalarTypeDefinitionNode): string {
  const dirs: readonly any[] | undefined = (s as any).directives;
  if (dirs) {
    for (const d of dirs) {
      if (d.name?.value === 'scalarMeta') {
        const arg = d.arguments?.find((a: any) => a.name?.value === 'jsonType');
        const v = arg && (arg.value as any).value;
        if (typeof v === 'string' && JSON_TYPE_CATEGORIES.has(v)) return v;
      }
    }
  }
  const name = s.name.value.toLowerCase();
  if (name.includes('date') || name.includes('time')) return 'string';
  if (name.includes('id') || name.includes('uuid')) return 'string';
  if (name.includes('json')) return 'object';
  if (name.includes('int') || name.includes('float') || name.includes('number'))
    return 'number';
  if (name.includes('boolean') || name === 'bool') return 'boolean';
  return 'unknown';
}

export function diffScalars(
  oldIdx: IndexedSchema,
  newIdx: IndexedSchema,
  ctx: DiffContext
) {
  const names = unionKeys(oldIdx.scalars, newIdx.scalars);
  const scalarEvaluations: any[] = [];
  for (const name of names) {
    const o = oldIdx.scalars[name];
    const n = newIdx.scalars[name];
    if (!o && n) {
      const currType = extractScalarJsonType(n);
      pushEntry(ctx, {
        element: name,
        elementType: ElementType.SCALAR,
        changeType: ChangeType.ADDITIVE,
        detail: `Scalar added: ${name}`,
        current: { jsonType: currType },
      });
      scalarEvaluations.push({
        scalarName: name,
        jsonTypeCurrent: currType,
        behaviorChangeClassification: 'NON_BREAKING',
        reason: 'New scalar',
      });
      continue;
    }
    if (o && !n) {
      const prevType = extractScalarJsonType(o);
      pushEntry(ctx, {
        element: name,
        elementType: ElementType.SCALAR,
        changeType: ChangeType.BREAKING,
        detail: `Scalar removed: ${name}`,
        previous: { jsonType: prevType },
      });
      scalarEvaluations.push({
        scalarName: name,
        jsonTypePrevious: prevType,
        jsonTypeCurrent: 'unknown',
        behaviorChangeClassification: 'BREAKING',
        reason: 'Scalar removed',
      });
      continue;
    }
    if (o && n) {
      const prevType = extractScalarJsonType(o);
      const currType = extractScalarJsonType(n);
      const oldDesc = o.description?.value || '';
      const newDesc = n.description?.value || '';
      if (prevType !== currType) {
        pushEntry(ctx, {
          element: name,
          elementType: ElementType.SCALAR,
          changeType: ChangeType.BREAKING,
          detail: `Scalar JSON type category changed: ${name} ${prevType}->${currType}`,
          previous: { jsonType: prevType },
          current: { jsonType: currType },
        });
        scalarEvaluations.push({
          scalarName: name,
          jsonTypePrevious: prevType,
          jsonTypeCurrent: currType,
          behaviorChangeClassification: 'BREAKING',
          reason: `JSON type changed: ${prevType}->${currType}`,
        });
      } else {
        if (oldDesc !== newDesc) {
          pushEntry(ctx, {
            element: name,
            elementType: ElementType.SCALAR,
            changeType: ChangeType.INFO,
            detail: `Scalar description changed: ${name}`,
          });
        }
        scalarEvaluations.push({
          scalarName: name,
          jsonTypePrevious: prevType,
          jsonTypeCurrent: currType,
          behaviorChangeClassification: 'NON_BREAKING',
          reason: 'No jsonType change',
        });
      }
    }
  }
  if (scalarEvaluations.length) ctx.scalarEvaluations = scalarEvaluations;
}
