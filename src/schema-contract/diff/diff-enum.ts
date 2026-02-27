import {
  getDeprecationDirective,
  parseDeprecationReason,
} from '../deprecation/parser';
import { ChangeType, ElementType } from '../model';
import { unionKeys } from './cleanup';
import { DiffContext, IndexedSchema, pushEntry } from './diff-core';

export function diffEnums(
  oldIdx: IndexedSchema,
  newIdx: IndexedSchema,
  ctx: DiffContext
) {
  const names = unionKeys(oldIdx.enums, newIdx.enums);
  for (const name of names) {
    const o = oldIdx.enums[name];
    const n = newIdx.enums[name];
    if (!o && n) {
      pushEntry(ctx, {
        element: name,
        elementType: ElementType.TYPE,
        changeType: ChangeType.ADDITIVE,
        detail: `Enum added: ${name}`,
      });
      continue;
    }
    if (o && !n) {
      pushEntry(ctx, {
        element: name,
        elementType: ElementType.TYPE,
        changeType: ChangeType.BREAKING,
        detail: `Enum removed: ${name}`,
      });
      continue;
    }
    if (o && n) {
      const oldVals = new Set(o.values?.map(v => v.name.value));
      const newVals = new Set(n.values?.map(v => v.name.value));
      for (const v of newVals) {
        if (!oldVals.has(v)) {
          pushEntry(ctx, {
            element: `${name}.${v}`,
            elementType: ElementType.ENUM_VALUE,
            changeType: ChangeType.ADDITIVE,
            detail: `Enum value added: ${v}`,
          });
        } else {
          const oldNode = o.values?.find(ev => ev.name.value === v);
          const newNode = n.values?.find(ev => ev.name.value === v);
          if (oldNode && newNode) {
            const oldDep = getDeprecationDirective(oldNode);
            const newDep = getDeprecationDirective(newNode);
            if (!oldDep && newDep) {
              const introducedAt = new Date();
              const parsed = parseDeprecationReason(
                newDep.reason,
                introducedAt,
                new Date()
              );
              const key = `${name}.${v}`;
              if (parsed.formatValid) {
                pushEntry(ctx, {
                  element: key,
                  elementType: ElementType.ENUM_VALUE,
                  changeType: ChangeType.DEPRECATED,
                  detail: `Enum value deprecated with removal target ${parsed.removeAfter}`,
                  deprecationFormatValid: true,
                  removeAfter: parsed.removeAfter,
                });
              } else {
                pushEntry(ctx, {
                  element: key,
                  elementType: ElementType.ENUM_VALUE,
                  changeType: ChangeType.INVALID_DEPRECATION_FORMAT,
                  detail: `Invalid deprecation reason format on enum value ${key}`,
                  deprecationFormatValid: false,
                });
              }
            }
          }
        }
      }
      for (const v of oldVals) {
        if (!newVals.has(v)) {
          const oldNode = o.values?.find(ev => ev.name.value === v);
          const dep = oldNode ? getDeprecationDirective(oldNode) : null;
          const key = `${name}.${v}`;
          if (!dep) {
            pushEntry(ctx, {
              element: key,
              elementType: ElementType.ENUM_VALUE,
              changeType: ChangeType.BREAKING,
              detail: `Enum value removed without prior deprecation: ${v}`,
            });
          } else {
            const parsed = parseDeprecationReason(dep.reason);
            if (!parsed.formatValid) {
              pushEntry(ctx, {
                element: key,
                elementType: ElementType.ENUM_VALUE,
                changeType: ChangeType.BREAKING,
                detail: `Enum value removed but prior deprecation format invalid: ${v}`,
                deprecationFormatValid: false,
              });
            } else {
              const prev = ctx.previousDeprecations.get(key);
              const sinceDate = prev?.sinceDate;
              if (!sinceDate) {
                pushEntry(ctx, {
                  element: key,
                  elementType: ElementType.ENUM_VALUE,
                  changeType: ChangeType.BREAKING,
                  detail: `Enum value removed but no recorded sinceDate in registry: ${v}`,
                  removeAfter: parsed.removeAfter,
                  deprecationFormatValid: true,
                });
              } else {
                const today = new Date();
                const removeAfter = new Date(
                  parsed.removeAfter! + 'T00:00:00Z'
                );
                const sinceDateObj = new Date(sinceDate + 'T00:00:00Z');
                const daysElapsed = Math.floor(
                  (today.getTime() - sinceDateObj.getTime()) /
                    (24 * 3600 * 1000)
                );
                const windowMet = today >= removeAfter;
                const minDays = daysElapsed >= 90;
                if (windowMet && minDays) {
                  pushEntry(ctx, {
                    element: key,
                    elementType: ElementType.ENUM_VALUE,
                    changeType: ChangeType.INFO,
                    detail: `Enum value retired after deprecation window: ${v}`,
                    deprecationFormatValid: true,
                    removeAfter: parsed.removeAfter,
                    sinceDate,
                  });
                } else {
                  pushEntry(ctx, {
                    element: key,
                    elementType: ElementType.ENUM_VALUE,
                    changeType: windowMet
                      ? ChangeType.BREAKING
                      : ChangeType.PREMATURE_REMOVAL,
                    detail: windowMet
                      ? `Enum value removed but 90-day window not satisfied (elapsed ${daysElapsed}): ${v}`
                      : `Enum value removal premature (before ${parsed.removeAfter}): ${v}`,
                    deprecationFormatValid: true,
                    removeAfter: parsed.removeAfter,
                    sinceDate,
                  });
                }
              }
            }
          }
        }
      }
    }
  }
}
