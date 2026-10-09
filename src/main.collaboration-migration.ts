import { CollaborationMigrationWorkerModule } from '@core/bootstrap/collaboration-migration.worker.module';
import { NestFactory } from '@nestjs/core';
import {
  CollaborationMigrationService,
  MemoImageRepairService,
} from '@services/collaboration-integration/migration';
import { parseCollaborationMigrationCommand } from '@services/collaboration-integration/migration/collaboration-migration.cli';

/**
 * One-shot operator entry for the 006 legacy-content back-fill + verification
 * (Release A). Migration mode and verify mode are EXPLICIT, mutually exclusive
 * CLI choices — there is NO default mutating action:
 *
 *   node dist/main.collaboration-migration --migrate [--dry-run]
 *   node dist/main.collaboration-migration --verify
 *   node dist/main.collaboration-migration --repair-memo-images --actor-id <uuid> [--apply] [--memo-id <uuid>]...
 *
 * Prints one machine-readable JSON line and a human-readable summary (no
 * secrets), and exits non-zero on any non-clean outcome (migrate: source-flagged,
 * migrated-with-explicit-visual-loss, or failed rows;
 * verify: any NULL pointer, any pointer that does not resolve in file-service, or
 * any snapshot that fails decode / content-root-schema validation;
 * memo image repair: any document whose inspection or repair failed).
 * Boots a minimal side-effect-free Nest application context (no scheduler / RMQ /
 * Redis / HTTP) — see `CollaborationMigrationWorkerModule`.
 */
const USAGE =
  'usage: main.collaboration-migration (--migrate [--dry-run] | --verify | --repair-memo-images --actor-id <uuid> [--apply] [--memo-id <uuid>]...)';

const run = async (): Promise<number> => {
  const command = parseCollaborationMigrationCommand(process.argv.slice(2));
  if (!command) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }

  const app = await NestFactory.createApplicationContext(
    CollaborationMigrationWorkerModule,
    { logger: ['error', 'warn', 'log'] }
  );
  try {
    if (command.mode === 'verify') {
      const service = app.get(CollaborationMigrationService);
      const summary = await service.verifyAll();
      process.stdout.write(
        `${JSON.stringify({ mode: 'verify', ...summary })}\n`
      );
      process.stdout.write(
        `verify: ${summary.ok ? 'OK' : 'FAILED'} — pending=${summary.pendingMigrationTotal} (memo=${summary.memoPendingMigrations}, whiteboard=${summary.whiteboardPendingMigrations}), nullPointers=${summary.nullPointerTotal} (memo=${summary.memoNullPointers}, whiteboard=${summary.whiteboardNullPointers}), pointersChecked=${summary.pointersChecked}, unresolved=${summary.unresolved.length}, invalid=${summary.invalid.length}\n`
      );
      return summary.ok ? 0 : 1;
    }

    if (command.mode === 'repair-memo-images') {
      const service = app.get(MemoImageRepairService);
      const summary = await service.repairMemoImages({
        actorId: command.actorId,
        apply: command.apply,
        memoIds: command.memoIds,
      });
      process.stdout.write(
        `${JSON.stringify({ mode: command.mode, ...summary })}\n`
      );
      process.stdout.write(
        `repair-memo-images${summary.dryRun ? ' (dry-run)' : ''}: total=${summary.total} affected=${summary.affected} proposed=${summary.proposedRemovals} repaired=${summary.repaired} removed=${summary.removedReferences} failed=${summary.failed}\n`
      );
      return summary.failed === 0 ? 0 : 1;
    }

    const service = app.get(CollaborationMigrationService);
    const summary = await service.migrateAll({ dryRun: command.dryRun });
    process.stdout.write(
      `${JSON.stringify({ mode: 'migrate', ...summary })}\n`
    );
    process.stdout.write(
      `migrate${command.dryRun ? ' (dry-run)' : ''}: total=${summary.total} migrated=${summary.migrated} unattached=${summary.unattached} flagged=${summary.flagged} failed=${summary.failed}\n`
    );
    return summary.failed === 0 && summary.flagged === 0 ? 0 : 1;
  } finally {
    await app.close();
  }
};

run()
  .then(code => {
    // Set exitCode; do NOT call process.exit(): an explicit exit can truncate the
    // JSON/human stdout writes when stdout is a pipe, defeating the operator
    // evidence. The Nest context is already closed in run()'s finally, so the
    // process drains its streams and exits with this code naturally.
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`
    );
    process.exitCode = 1;
  });
