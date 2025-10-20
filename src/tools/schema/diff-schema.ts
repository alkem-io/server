#!/usr/bin/env ts-node
// GraphQL Schema Diff & Deprecation Lifecycle Tool (Feature 002)
// Implements:
//  - Deterministic AST diff for object types, fields, enums, enum values, scalars
//  - Classification: ADDITIVE, DEPRECATED, INVALID_DEPRECATION_FORMAT, BREAKING, PREMATURE_REMOVAL, INFO, BASELINE
//  - Field & enum value deprecation detection (reason string parsing per FR-013..FR-016)
//  - Enum value retirement / premature removal logic (approximate sinceDate)
//  - Field retirement lifecycle (approximate sinceDate)
//  - Nullability change refinement: narrowing = BREAKING; widening = INFO (interim policy)
//  - Deprecation registry emission (active + retired)
// Remaining TODOs (tracked in tasks/spec):
//  - Override integration (FR-003) via CODEOWNERS + PR reviews (overrideApplied flag)
//  - Scalar JSON type behavior evaluation (FR-017..FR-019) – IMPLEMENTED: infers jsonType category & classifies behavioral changes
//  - Deprecation sinceDate accuracy via historical registry / git blame rather than approximation
//  - Grace period warning for newly added deprecations missing REMOVE_AFTER (FR-014 nuanced timing) — current parser treats absence as invalid
//  - Enum value addition referencing prior soft-deprecation metadata (FR-010 partial nuance)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import {
  ScalarTypeDefinitionNode,
  FieldDefinitionNode,
  TypeNode,
  DirectiveNode,
} from 'graphql';
import {
  ChangeReport,
  ChangeEntry,
  DeprecationEntry,
  ElementType,
  ChangeType,
} from './types';
import { performOverrideEvaluation } from './override';
import { parseDeprecationReason } from './deprecation-parser';
import {
  sha256,
  emptyCounts,
  baselineReport,
  IndexedSchema,
  indexSDL,
  DiffContext,
  pushEntry,
} from '../../schema-contract/diff/diff-core';

interface Args {
  oldPath: string | null;
  newPath: string;
  outPath: string;
  deprecationsPath?: string;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].substring(2);
      const val = argv[i + 1];
      args[key] = val;
      i++;
    }
  }
  return {
    oldPath: args.old ? args.old : null,
    newPath: args.new || 'schema.graphql',
    outPath: args.out || 'change-report.json',
    deprecationsPath: args.deprecations,
  };
}

// ---- Scalar JSON Type Inference Helpers (FR-017..FR-019) ----
const JSON_TYPE_CATEGORIES = new Set([
  'string',
  'number',
  'boolean',
  'object',
  'array',
  'unknown',
]);

function extractScalarJsonType(s: ScalarTypeDefinitionNode): string {
  const dirs: readonly DirectiveNode[] | undefined = s.directives;
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

function getDeprecationDirective(node: {
  directives?: readonly any[];
}): { reason?: string } | null {
  if (!node.directives) return null;
  const dep = node.directives.find(d => d.name?.value === 'deprecated');
  if (!dep) return null;
  const arg = dep.arguments?.find((a: any) => a.name?.value === 'reason');
  if (!arg || !arg.value) return { reason: undefined };
  if (arg.value.kind === 'StringValue') {
    return { reason: arg.value.value };
  }
  return { reason: undefined };
}

function printTypeNode(node: TypeNode): string {
  switch (node.kind) {
    case 'NamedType':
      return node.name.value;
    case 'NonNullType':
      return printTypeNode(node.type) + '!';
    case 'ListType':
      return '[' + printTypeNode(node.type) + ']';
    default: {
      // Should be unreachable with current GraphQL TypeNode union
      return 'UNKNOWN';
    }
  }
}

function isNonNull(node: TypeNode): boolean {
  return node.kind === 'NonNullType';
}

// (helper unwrapNonNull removed – not yet needed for current diff logic)

function diffTypes(
  oldIdx: IndexedSchema,
  newIdx: IndexedSchema,
  ctx: DiffContext
) {
  const oldNames = Object.keys(oldIdx.types);
  const newNames = Object.keys(newIdx.types);
  const allNames = new Set([...oldNames, ...newNames]);
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
      // Fields diff
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
        if (!of && nf) {
          pushEntry(ctx, {
            element: `${name}.${fname}`,
            elementType: ElementType.FIELD,
            changeType: ChangeType.ADDITIVE,
            detail: `Field added: ${name}.${fname} : ${printTypeNode(nf.type)}`,
          });
          continue;
        }
        if (of && !nf) {
          const key = `${name}.${fname}`;
          // Field removal – validate prior deprecation exists & meets window
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
          if (!parsed.formatValid || !parsed.removeAfter) {
            pushEntry(ctx, {
              element: key,
              elementType: ElementType.FIELD,
              changeType: ChangeType.BREAKING,
              detail: `Field removed but deprecation reason invalid: ${key}`,
              deprecationFormatValid: false,
            });
            continue;
          }
          const today = new Date();
          const removeAfterDate = new Date(parsed.removeAfter + 'T00:00:00Z');
          const prev = ctx.previousDeprecations.get(key);
          const sinceDate = prev?.sinceDate; // rely on registry for real sinceDate
          if (!sinceDate) {
            // Missing historical entry; treat as breaking because lifecycle cannot be proven
            pushEntry(ctx, {
              element: key,
              elementType: ElementType.FIELD,
              changeType: ChangeType.BREAKING,
              detail: `Field removed but no recorded sinceDate in registry: ${key}`,
            });
            continue;
          }
          const sinceDateObj = new Date(sinceDate + 'T00:00:00Z');
          const daysElapsed = Math.floor(
            (today.getTime() - sinceDateObj.getTime()) / (24 * 3600 * 1000)
          );
          const windowMet = today.getTime() >= removeAfterDate.getTime();
          const minDaysMet = daysElapsed >= 90;
          if (windowMet && minDaysMet) {
            pushEntry(ctx, {
              element: key,
              elementType: ElementType.FIELD,
              changeType: ChangeType.INFO,
              detail: `Field retired after deprecation window: ${key}`,
              deprecationFormatValid: true,
              removeAfter: parsed.removeAfter,
              sinceDate,
            });
            ctx.deprecations.push({
              element: key,
              elementType: ElementType.FIELD,
              sinceDate,
              removeAfter: parsed.removeAfter,
              humanReason: parsed.humanReason || '',
              formatValid: true,
              retired: true,
              retirementDate: today.toISOString().slice(0, 10),
              firstCommit: prev?.firstCommit,
            });
          } else {
            pushEntry(ctx, {
              element: key,
              elementType: ElementType.FIELD,
              changeType: windowMet
                ? ChangeType.BREAKING
                : ChangeType.PREMATURE_REMOVAL,
              detail: windowMet
                ? `Field removed but 90-day window not satisfied (elapsed ${daysElapsed}): ${key}`
                : `Field removal premature (before ${parsed.removeAfter}): ${key}`,
              deprecationFormatValid: true,
              removeAfter: parsed.removeAfter,
              sinceDate,
            });
          }
          continue;
        }
        if (of && nf) {
          const oldTypeStr = printTypeNode(of.type);
          const newTypeStr = printTypeNode(nf.type);
          // Deprecation detection (FR-004, FR-013..FR-016)
          const oldDep = getDeprecationDirective(of); // presence only used to detect newly added deprecation
          const newDep = getDeprecationDirective(nf);
          if (!oldDep && newDep) {
            const introducedAt = new Date();
            const parsed = parseDeprecationReason(
              newDep.reason,
              introducedAt,
              new Date()
            );
            let changeType: ChangeEntry['changeType'];
            if (parsed.formatValid) {
              changeType = ChangeType.DEPRECATED;
            } else if (parsed.warnings.length > 0) {
              changeType = ChangeType.DEPRECATION_GRACE;
            } else {
              changeType = ChangeType.INVALID_DEPRECATION_FORMAT;
            }
            pushEntry(ctx, {
              element: `${name}.${fname}`,
              elementType: ElementType.FIELD,
              changeType,
              detail: parsed.formatValid
                ? `Field deprecated with removal target ${parsed.removeAfter}`
                : parsed.warnings.length > 0
                  ? 'Field deprecated without REMOVE_AFTER (grace period <24h)'
                  : `Invalid deprecation reason format on field ${name}.${fname}`,
              deprecationFormatValid: parsed.formatValid,
              removeAfter: parsed.removeAfter,
              grace: changeType === ChangeType.DEPRECATION_GRACE,
              graceExpiresAt:
                changeType === ChangeType.DEPRECATION_GRACE
                  ? new Date(
                      introducedAt.getTime() + 24 * 3600 * 1000
                    ).toISOString()
                  : undefined,
              firstCommit: ctx.headCommit,
            });
            if (parsed.formatValid && parsed.removeAfter) {
              const key = `${name}.${fname}`;
              const prev = ctx.previousDeprecations.get(key);
              const sinceDate =
                prev?.sinceDate || new Date().toISOString().slice(0, 10);
              // Validate 90 day window (FR-012)
              const removeAfterDate = new Date(
                parsed.removeAfter + 'T00:00:00Z'
              );
              const sinceDateObj = new Date(sinceDate + 'T00:00:00Z');
              const deltaDays = Math.floor(
                (removeAfterDate.getTime() - sinceDateObj.getTime()) /
                  (24 * 3600 * 1000)
              );
              if (deltaDays < 90) {
                // Mark change entry invalid instead (retroactively adjust)
                ctx.entries = ctx.entries.map(e =>
                  e.element === key && e.changeType === ChangeType.DEPRECATED
                    ? {
                        ...e,
                        changeType: ChangeType.INVALID_DEPRECATION_FORMAT,
                        detail: `Removal window <90 days (${deltaDays}) for ${key}`,
                      }
                    : e
                );
              } else {
                ctx.deprecations.push({
                  element: key,
                  elementType: ElementType.FIELD,
                  sinceDate,
                  removeAfter: parsed.removeAfter,
                  humanReason: parsed.humanReason || '',
                  formatValid: true,
                  retired: false,
                  firstCommit: prev?.firstCommit || ctx.headCommit,
                });
              }
            }
          }
          if (oldTypeStr !== newTypeStr) {
            // Refined nullability/type change handling
            // FR-008: narrowing (nullable -> non-nullable) MUST be BREAKING.
            // Widening (non-nullable -> nullable) is potentially additive for clients tolerant of nulls, classify as INFO for now.
            const oldNonNull = isNonNull(of.type);
            const newNonNull = isNonNull(nf.type);
            let changeType: ChangeEntry['changeType'] = ChangeType.BREAKING;
            if (oldNonNull && !newNonNull) {
              changeType = ChangeType.INFO; // widening
            } else if (!oldNonNull && newNonNull) {
              changeType = ChangeType.BREAKING; // narrowing
            } else if (oldNonNull === newNonNull) {
              // Same nullability but different named/list type -> BREAKING
              changeType = ChangeType.BREAKING;
            }
            pushEntry(ctx, {
              element: `${name}.${fname}`,
              elementType: ElementType.FIELD,
              changeType,
              detail: `Field type changed: ${oldTypeStr} -> ${newTypeStr}`,
            });
            continue;
          }
          // Description-only change detection (INFO). If descriptions differ but type same.
          const oldDesc = of.description?.value || '';
          const newDesc = nf.description?.value || '';
          if (oldDesc !== newDesc) {
            pushEntry(ctx, {
              element: `${name}.${fname}`,
              elementType: ElementType.FIELD,
              changeType: ChangeType.INFO,
              detail: `Description changed for ${name}.${fname}`,
            });
          }
        }
      }
    }
  }
}

function diffEnums(
  oldIdx: IndexedSchema,
  newIdx: IndexedSchema,
  ctx: DiffContext
) {
  const names = new Set([
    ...Object.keys(oldIdx.enums),
    ...Object.keys(newIdx.enums),
  ]);
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
          // Value existed before; check if newly deprecated
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
              let changeType: ChangeEntry['changeType'];
              if (parsed.formatValid) {
                changeType = ChangeType.DEPRECATED;
              } else if (parsed.warnings.length > 0) {
                changeType = ChangeType.DEPRECATION_GRACE;
              } else {
                changeType = ChangeType.INVALID_DEPRECATION_FORMAT;
              }
              pushEntry(ctx, {
                element: `${name}.${v}`,
                elementType: ElementType.ENUM_VALUE,
                changeType,
                detail: parsed.formatValid
                  ? `Enum value deprecated with removal target ${parsed.removeAfter}`
                  : parsed.warnings.length > 0
                    ? 'Enum value deprecated without REMOVE_AFTER (grace period <24h)'
                    : `Invalid deprecation reason format on enum value ${name}.${v}`,
                deprecationFormatValid: parsed.formatValid,
                removeAfter: parsed.removeAfter,
                grace: changeType === ChangeType.DEPRECATION_GRACE,
                graceExpiresAt:
                  changeType === ChangeType.DEPRECATION_GRACE
                    ? new Date(
                        introducedAt.getTime() + 24 * 3600 * 1000
                      ).toISOString()
                    : undefined,
                firstCommit: ctx.headCommit,
              });
              if (parsed.formatValid && parsed.removeAfter) {
                const key = `${name}.${v}`;
                const prev = ctx.previousDeprecations.get(key);
                const sinceDate =
                  prev?.sinceDate || new Date().toISOString().slice(0, 10);
                const removeAfterDate = new Date(
                  parsed.removeAfter + 'T00:00:00Z'
                );
                const sinceDateObj = new Date(sinceDate + 'T00:00:00Z');
                const deltaDays = Math.floor(
                  (removeAfterDate.getTime() - sinceDateObj.getTime()) /
                    (24 * 3600 * 1000)
                );
                if (deltaDays < 90) {
                  ctx.entries = ctx.entries.map(e =>
                    e.element === key && e.changeType === ChangeType.DEPRECATED
                      ? {
                          ...e,
                          changeType: ChangeType.INVALID_DEPRECATION_FORMAT,
                          detail: `Removal window <90 days (${deltaDays}) for ${key}`,
                        }
                      : e
                  );
                } else {
                  ctx.deprecations.push({
                    element: key,
                    elementType: ElementType.ENUM_VALUE,
                    sinceDate,
                    removeAfter: parsed.removeAfter,
                    humanReason: parsed.humanReason || '',
                    formatValid: true,
                    retired: false,
                    firstCommit: prev?.firstCommit || ctx.headCommit,
                  });
                }
              }
            }
          }
        }
      }
      for (const v of oldVals) {
        if (!newVals.has(v)) {
          // Removal classification per FR-009..FR-015
          const oldNode = o.values?.find(ev => ev.name.value === v);
          const dep = oldNode ? getDeprecationDirective(oldNode) : null;
          if (!dep) {
            pushEntry(ctx, {
              element: `${name}.${v}`,
              elementType: ElementType.ENUM_VALUE,
              changeType: ChangeType.BREAKING,
              detail: `Enum value removed without prior deprecation: ${v}`,
            });
          } else {
            const parsed = parseDeprecationReason(dep.reason);
            if (!parsed.formatValid) {
              pushEntry(ctx, {
                element: `${name}.${v}`,
                elementType: ElementType.ENUM_VALUE,
                changeType: ChangeType.BREAKING,
                detail: `Enum value removed but prior deprecation format invalid: ${v}`,
                deprecationFormatValid: false,
              });
            } else {
              const today = new Date();
              const removeAfterDate = new Date(
                parsed.removeAfter! + 'T00:00:00Z'
              );
              const key = `${name}.${v}`;
              const prev = ctx.previousDeprecations.get(key);
              const sinceDate = prev?.sinceDate;
              if (!sinceDate) {
                pushEntry(ctx, {
                  element: key,
                  elementType: ElementType.ENUM_VALUE,
                  changeType: ChangeType.BREAKING,
                  detail: `Enum value removed but no recorded sinceDate in registry: ${v}`,
                  deprecationFormatValid: true,
                  removeAfter: parsed.removeAfter,
                });
              } else {
                const sinceDateObj = new Date(sinceDate + 'T00:00:00Z');
                const daysElapsed = Math.floor(
                  (today.getTime() - sinceDateObj.getTime()) /
                    (24 * 3600 * 1000)
                );
                const windowMet = today.getTime() >= removeAfterDate.getTime();
                const minDaysMet = daysElapsed >= 90;
                if (windowMet && minDaysMet) {
                  pushEntry(ctx, {
                    element: key,
                    elementType: ElementType.ENUM_VALUE,
                    changeType: ChangeType.INFO,
                    detail: `Enum value retired after deprecation window: ${v}`,
                    deprecationFormatValid: true,
                    removeAfter: parsed.removeAfter,
                    sinceDate,
                  });
                  ctx.deprecations.push({
                    element: key,
                    elementType: ElementType.ENUM_VALUE,
                    sinceDate,
                    removeAfter: parsed.removeAfter!,
                    humanReason: parsed.humanReason || '',
                    formatValid: true,
                    retired: true,
                    retirementDate: new Date().toISOString().slice(0, 10),
                    firstCommit: prev?.firstCommit,
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

function diffScalars(
  oldIdx: IndexedSchema,
  newIdx: IndexedSchema,
  ctx: DiffContext
) {
  const names = new Set([
    ...Object.keys(oldIdx.scalars),
    ...Object.keys(newIdx.scalars),
  ]);
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

function buildReport(
  oldSDL: string,
  newSDL: string,
  ctx: DiffContext
): ChangeReport {
  const oldIdx = indexSDL(oldSDL);
  const newIdx = indexSDL(newSDL);
  diffTypes(oldIdx, newIdx, ctx);
  diffEnums(oldIdx, newIdx, ctx);
  diffScalars(oldIdx, newIdx, ctx);
  const report: ChangeReport = {
    snapshotId: sha256(newSDL),
    baseSnapshotId: sha256(oldSDL),
    generatedAt: new Date().toISOString(),
    classifications: ctx.counts,
    entries: ctx.entries,
    overrideApplied: false,
  };
  if (ctx.scalarEvaluations) {
    report.scalarEvaluations = ctx.scalarEvaluations;
  }
  if (ctx.counts.breaking > 0) {
    const override = performOverrideEvaluation();
    if (override.applied) {
      report.overrideApplied = true;
      report.overrideReviewer = override.reviewer;
      report.notes = [
        ...(report.notes || []),
        `Override applied by ${override.reviewer}: ${override.reason}`,
      ];
      // Mark each breaking entry with override flag
      report.entries = report.entries.map(e =>
        e.changeType === ChangeType.BREAKING ? { ...e, override: true } : e
      );
    } else {
      report.notes = [
        ...(report.notes || []),
        'No valid override for breaking changes',
        ...(override.details || []),
      ];
    }
  }
  return report;
}

function main() {
  const args = parseArgs();
  const newSDL = readFileSync(args.newPath, 'utf-8');
  if (!args.oldPath) {
    const report = baselineReport(newSDL);
    writeFileSync(args.outPath, JSON.stringify(report, null, 2));
    if (args.deprecationsPath) {
      writeFileSync(
        args.deprecationsPath,
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            entries: [],
          },
          null,
          2
        )
      );
    }
    process.stdout.write(`Baseline change report written to ${args.outPath}\n`);
    return;
  }
  const oldSDL = readFileSync(args.oldPath, 'utf-8');
  // Attempt to load previous deprecations registry (for sinceDate & firstCommit reuse)
  const previousDeprecations: Map<string, DeprecationEntry> = new Map();
  if (args.deprecationsPath && existsSync(args.deprecationsPath)) {
    try {
      const rawPrev = JSON.parse(readFileSync(args.deprecationsPath, 'utf-8'));
      if (rawPrev && Array.isArray(rawPrev.entries)) {
        for (const d of rawPrev.entries) {
          previousDeprecations.set(d.element, d);
        }
      }
    } catch {
      // ignore corrupted file
    }
  }
  let headCommit: string | undefined;
  try {
    headCommit = execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    // not a git repo / fallback
  }
  const diffCtx: DiffContext = {
    entries: [],
    counts: emptyCounts(),
    deprecations: [],
    previousDeprecations,
    headCommit,
  };
  const report = buildReport(oldSDL, newSDL, diffCtx);
  writeFileSync(args.outPath, JSON.stringify(report, null, 2));
  if (args.deprecationsPath) {
    writeFileSync(
      args.deprecationsPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          entries: diffCtx.deprecations,
        },
        null,
        2
      )
    );
  }
  process.stdout.write(`Change report scaffold written to ${args.outPath}\n`);
}

main();
