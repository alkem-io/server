import { CollaborationMigrationWorkerModule } from '@core/bootstrap/collaboration-migration.worker.module';
import { NestFactory } from '@nestjs/core';
import { CollaborationMigrationService } from '@services/collaboration-integration/migration';

/**
 * One-shot operator entry for the 006 legacy-content back-fill + verification
 * (Release A). Migration mode and verify mode are EXPLICIT, mutually exclusive
 * CLI choices — there is NO default mutating action:
 *
 *   node dist/main.collaboration-migration --migrate [--dry-run]
 *   node dist/main.collaboration-migration --verify
 *
 * Prints one machine-readable JSON line and a human-readable summary (no
 * secrets), and exits non-zero on any non-clean outcome (migrate: source-flagged,
 * migrated-with-explicit-visual-loss, or failed rows;
 * verify: any NULL pointer, any pointer that does not resolve in file-service, or
 * any snapshot that fails decode / content-root-schema validation).
 * Boots a minimal side-effect-free Nest application context (no scheduler / RMQ /
 * Redis / HTTP) — see `CollaborationMigrationWorkerModule`.
 */
const USAGE =
  'usage: main.collaboration-migration (--migrate [--dry-run] | --verify)';

const run = async (): Promise<number> => {
  const args = process.argv.slice(2);
  const migrate = args.includes('--migrate');
  const verify = args.includes('--verify');
  const dryRun = args.includes('--dry-run');

  // Exactly one explicit mode is required — no default mutating action.
  if (migrate === verify) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }

  const app = await NestFactory.createApplicationContext(
    CollaborationMigrationWorkerModule,
    { logger: ['error', 'warn', 'log'] }
  );
  try {
    const service = app.get(CollaborationMigrationService);

    if (verify) {
      const summary = await service.verifyAll();
      process.stdout.write(
        `${JSON.stringify({ mode: 'verify', ...summary })}\n`
      );
      process.stdout.write(
        `verify: ${summary.ok ? 'OK' : 'FAILED'} — pending=${summary.pendingMigrationTotal} (memo=${summary.memoPendingMigrations}, whiteboard=${summary.whiteboardPendingMigrations}), nullPointers=${summary.nullPointerTotal} (memo=${summary.memoNullPointers}, whiteboard=${summary.whiteboardNullPointers}), pointersChecked=${summary.pointersChecked}, unresolved=${summary.unresolved.length}, invalid=${summary.invalid.length}\n`
      );
      return summary.ok ? 0 : 1;
    }

    const summary = await service.migrateAll({ dryRun });
    process.stdout.write(
      `${JSON.stringify({ mode: 'migrate', ...summary })}\n`
    );
    process.stdout.write(
      `migrate${dryRun ? ' (dry-run)' : ''}: total=${summary.total} migrated=${summary.migrated} unattached=${summary.unattached} flagged=${summary.flagged} failed=${summary.failed}\n`
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
