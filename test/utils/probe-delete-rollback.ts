#!/usr/bin/env ts-node
/**
 * One-time manual probe (Fork 5 falsification-first ordering): forces the
 * LAST step of the account-deletion transaction to throw and asserts, over a
 * real Postgres connection, that the user's profile/settings/actor rows
 * survive — i.e. that RegistrationService.deleteUserWithPendingMemberships'
 * transaction genuinely rolls back on the pinned TypeORM fork
 * (pkg.pr.new/antst/typeorm), rather than only appearing to via the unit
 * mechanism spec's mocked EntityManager
 * (test/integration/account-deletion/delete-user-transaction.spec.ts).
 *
 * This is deliberately NOT a vitest spec: it needs a live server process
 * (real DI graph, real database connection) and it seeds/deletes a
 * throwaway user, so it is not safe to run unattended in CI or against a
 * shared database. Run it by hand against the compose Postgres described in
 * quickstart.md:
 *
 *   COMPOSE_PROJECT_NAME=<isolated-name> pnpm run start:services
 *   pnpm run migration:run
 *   npx ts-node -r tsconfig-paths/register test/utils/probe-delete-rollback.ts
 *
 * Record the observed PASS/FAIL result in the PR body and the forge ledger
 * per the plan's falsification-first ordering — if this probe shows the
 * rollback does NOT hold, STOP and re-plan before trusting the mechanism
 * spec's mocked assertion.
 */
import { NestFactory } from '@nestjs/core';
import { getDataSourceToken } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { AccountDeletionAuditService } from '../../src/domain/community/user/account-deletion/account.deletion.audit.service';
import { UserService } from '../../src/domain/community/user/user.service';
import { RegistrationService } from '../../src/services/api/registration/registration.service';

const PROBE_EMAIL = `probe-delete-rollback-${Date.now()}@test.alkem.io`;

// The whole point of this script is its human-facing console report — this
// is the one file in the workspace where that is the intended output, not a
// forgotten debug line.
function report(...args: unknown[]): void {
  // biome-ignore lint/suspicious/noConsole: manual CLI probe, console output IS the report
  console.log(...args);
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = app.get<DataSource>(getDataSourceToken());
    const userService = app.get(UserService);
    const registrationService = app.get(RegistrationService);
    const auditService = app.get(AccountDeletionAuditService);

    report(
      `[probe] Creating throwaway user ${PROBE_EMAIL} with no resources...`
    );
    const user = await userService.createUser({
      email: PROBE_EMAIL,
      firstName: 'Probe',
      lastName: 'DeleteRollback',
    } as any);
    const userID = user.id;

    // Force the LAST in-transaction step — the primary audit write — to
    // throw, by monkey-patching the injected service instance for the
    // duration of this one call.
    const originalWritePrimary = auditService.writePrimary.bind(auditService);
    auditService.writePrimary = async () => {
      throw new Error('[probe] forced failure at the last transactional step');
    };

    let observedRollback: 'pass' | 'fail' | 'unknown' = 'unknown';
    try {
      await registrationService.deleteUserWithPendingMemberships(
        { ID: userID, deleteIdentity: true } as any,
        'self'
      );
      report(
        '[probe] UNEXPECTED: deletion resolved successfully despite the forced failure — the mechanism spec assumption may not hold.'
      );
      observedRollback = 'fail';
    } catch (error) {
      report(
        '[probe] deletion rejected as expected:',
        (error as Error).message
      );

      const survivingUser = await dataSource.query(
        `SELECT id FROM "user" WHERE id = $1`,
        [userID]
      );
      const survivingActor = await dataSource.query(
        `SELECT id FROM actor WHERE id = $1`,
        [userID]
      );

      if (survivingUser.length === 1 && survivingActor.length === 1) {
        report(
          '[probe] PASS: user/actor rows survive the forced failure — the transaction genuinely rolled back on this TypeORM fork.'
        );
        observedRollback = 'pass';
      } else {
        report(
          '[probe] FAIL: user/actor rows are gone despite the forced failure — the transaction did NOT roll back. The pinned TypeORM fork does not propagate the transactional EntityManager as assumed.'
        );
        observedRollback = 'fail';
      }
    } finally {
      auditService.writePrimary = originalWritePrimary;
    }

    report(`[probe] RESULT: ${observedRollback}`);

    // Best-effort cleanup regardless of outcome — never leave the probe
    // user behind in a shared database.
    try {
      await dataSource.query(`DELETE FROM "user" WHERE id = $1`, [userID]);
      await dataSource.query(`DELETE FROM actor WHERE id = $1`, [userID]);
    } catch {
      report(
        '[probe] cleanup query failed — verify manually that no probe user rows remain.'
      );
    }

    process.exitCode = observedRollback === 'pass' ? 0 : 1;
  } finally {
    await app.close();
  }
}

main().catch(error => {
  report('[probe] uncaught error', error);
  process.exitCode = 1;
});
