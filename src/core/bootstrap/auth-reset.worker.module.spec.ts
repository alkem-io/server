import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Structural guard for the auth-reset worker's module graph.
 *
 * `main.worker.ts` boots `AuthResetWorkerModule`, which deliberately does NOT
 * import `ScheduleModule` — the worker consumes the auth-reset queue and runs
 * no scheduled work. `SchedulerRegistry` is therefore provided ONLY on the API
 * process (`ScheduleModule.forRoot()` in `AppModule`).
 *
 * The trap this guards: leaving `ScheduleModule` out does not keep a scheduled
 * service off the worker. If any provider reachable from the worker's graph
 * REQUIRES `SchedulerRegistry`, Nest cannot resolve it and
 * `NestFactory.create(AuthResetWorkerModule)` throws at bootstrap — the pod
 * crash-loops and all authorization/license resets stop platform-wide. This
 * shipped once: `ConversationDigestSweepService` (034-messaging-notifications)
 * is a provider of `MessageInboxModule`, which is reachable via
 * AuthResetSubscriberModule -> SpaceModule -> CommunityModule ->
 * CommunicationModule -> MessageInboxModule.
 *
 * Injecting `SchedulerRegistry` `@Optional()` is the supported way to be
 * present in both graphs. A static walk rather than booting the module,
 * because booting it needs Postgres, Redis and RabbitMQ.
 */

const SRC = resolve(__dirname, '../..');

/** Strip block and line comments so commented-out code never counts. */
const stripComments = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const walk = (directory: string, suffix: string): string[] => {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      found.push(...walk(full, suffix));
    } else if (entry.name.endsWith(suffix)) {
      found.push(full);
    }
  }
  return found;
};

/** Contents of the first `<key>: [ ... ]` array in a @Module decorator. */
const decoratorArray = (source: string, key: string): string => {
  const start = source.indexOf(`${key}:`);
  if (start < 0) return '';
  const open = source.indexOf('[', start);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '[') depth++;
    else if (source[i] === ']' && --depth === 0) return source.slice(open, i);
  }
  return '';
};

const classNamesIn = (segment: string, suffix = ''): string[] => [
  ...new Set(
    (segment.match(/\b[A-Z][A-Za-z0-9_]*\b/g) ?? []).filter(name =>
      name.endsWith(suffix)
    )
  ),
];

describe('AuthResetWorkerModule graph (structural)', () => {
  const moduleFiles = walk(SRC, '.module.ts');

  /** Module class name -> its source, comments stripped. */
  const moduleSources = new Map<string, string>();
  for (const file of moduleFiles) {
    const source = stripComments(readFileSync(file, 'utf8'));
    for (const match of source.matchAll(/export class (\w+Module)\b/g)) {
      moduleSources.set(match[1], source);
    }
  }

  /** BFS over `imports:` from the worker root. */
  const reachableModules = (root: string): Set<string> => {
    const seen = new Set<string>([root]);
    const queue = [root];
    while (queue.length) {
      const source = moduleSources.get(queue.shift() as string);
      if (!source) continue;
      for (const imported of classNamesIn(
        decoratorArray(source, 'imports'),
        'Module'
      )) {
        if (!seen.has(imported)) {
          seen.add(imported);
          queue.push(imported);
        }
      }
    }
    return seen;
  };

  const reachable = reachableModules('AuthResetWorkerModule');

  it('reaches a large graph (guard is actually walking, not silently empty)', () => {
    expect(reachable.size).toBeGreaterThan(20);
    // The regression that motivated this guard came in through here.
    expect(reachable.has('MessageInboxModule')).toBe(true);
  });

  it('does not import ScheduleModule, so SchedulerRegistry is unavailable', () => {
    expect(reachable.has('ScheduleModule')).toBe(false);
  });

  it('has no provider that REQUIRES SchedulerRegistry', () => {
    // Class name -> source file, for every class in src.
    const classToSource = new Map<string, string>();
    for (const file of walk(SRC, '.ts')) {
      if (file.endsWith('.spec.ts')) continue;
      const source = stripComments(readFileSync(file, 'utf8'));
      for (const match of source.matchAll(/export class (\w+)\b/g)) {
        if (!classToSource.has(match[1])) classToSource.set(match[1], source);
      }
    }

    const offenders: string[] = [];
    for (const moduleName of reachable) {
      const moduleSource = moduleSources.get(moduleName);
      if (!moduleSource) continue;
      for (const provider of classNamesIn(
        decoratorArray(moduleSource, 'providers')
      )) {
        const source = classToSource.get(provider);
        if (!source?.includes('SchedulerRegistry')) continue;

        // Look only at the constructor parameter list.
        const ctor = source.indexOf('constructor(');
        if (ctor < 0) continue;
        let depth = 0;
        let end = ctor;
        for (let i = source.indexOf('(', ctor); i < source.length; i++) {
          if (source[i] === '(') depth++;
          else if (source[i] === ')' && --depth === 0) {
            end = i;
            break;
          }
        }
        const params = source.slice(ctor, end);
        const at = params.indexOf('SchedulerRegistry');
        if (at < 0) continue;

        // `@Optional()` must decorate the same parameter, i.e. appear after
        // the previous comma at this nesting level.
        const paramStart = params.lastIndexOf(',', at) + 1;
        if (!params.slice(paramStart, at).includes('@Optional')) {
          offenders.push(`${provider} (via ${moduleName})`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
