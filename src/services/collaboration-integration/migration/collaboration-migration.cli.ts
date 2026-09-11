import { isUUID } from 'class-validator';

export type CollaborationMigrationCommand =
  | { mode: 'migrate'; dryRun: boolean }
  | { mode: 'verify' }
  | {
      mode: 'repair-memo-images';
      actorId: string;
      apply: boolean;
      memoIds: string[];
    };

const readValue = (
  args: string[],
  index: number,
  name: string
): { value: string; nextIndex: number } | undefined => {
  const argument = args[index];
  const inlinePrefix = `${name}=`;
  if (argument.startsWith(inlinePrefix)) {
    return { value: argument.slice(inlinePrefix.length), nextIndex: index };
  }
  if (argument !== name || index + 1 >= args.length) {
    return undefined;
  }
  return { value: args[index + 1], nextIndex: index + 1 };
};

/** Parse the bounded, fail-closed collaboration migration worker command. */
export const parseCollaborationMigrationCommand = (
  args: string[]
): CollaborationMigrationCommand | undefined => {
  const modes = [
    args.includes('--migrate'),
    args.includes('--verify'),
    args.includes('--repair-memo-images'),
  ].filter(Boolean).length;
  if (modes !== 1) {
    return undefined;
  }

  if (args.includes('--migrate')) {
    const allowed = new Set(['--migrate', '--dry-run']);
    return args.every(argument => allowed.has(argument))
      ? { mode: 'migrate', dryRun: args.includes('--dry-run') }
      : undefined;
  }
  if (args.includes('--verify')) {
    return args.length === 1 ? { mode: 'verify' } : undefined;
  }

  let actorId: string | undefined;
  const memoIds: string[] = [];
  let apply = false;
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '--repair-memo-images') {
      continue;
    }
    if (argument === '--apply') {
      apply = true;
      continue;
    }
    const actor = readValue(args, index, '--actor-id');
    if (actor) {
      if (actorId !== undefined || !isUUID(actor.value)) {
        return undefined;
      }
      actorId = actor.value;
      index = actor.nextIndex;
      continue;
    }
    const memo = readValue(args, index, '--memo-id');
    if (memo) {
      if (!isUUID(memo.value)) {
        return undefined;
      }
      memoIds.push(memo.value);
      index = memo.nextIndex;
      continue;
    }
    return undefined;
  }

  if (!actorId) {
    return undefined;
  }
  return { mode: 'repair-memo-images', actorId, apply, memoIds };
};
