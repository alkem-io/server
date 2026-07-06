#!/usr/bin/env ts-node
// One-off validation tool: runs the real Space authorization reset against the
// connected database, exercising every entity load in the cascade. Used to
// verify the auth-load trimming (spec 105-optimize-auth-reset) does not break
// any load/guard. Usage:
//   ts-node -r tsconfig-paths/register src/tools/auth-reset/run-space-auth-reset.ts <spaceId> [--save]
// Without --save the recomputed child policies are NOT persisted (the Space and
// subspace policies are still saved internally by the service, as in production).

import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AuthorizationPolicyService } from '../../domain/common/authorization-policy/authorization.policy.service';
import { SpaceAuthorizationService } from '../../domain/space/space/space.service.authorization';
import { AppModule } from '../../app.module';

// Wraps the pg pool so every query run during the reset is counted, along with
// the number of rows hydrated and the total field-cells (rows × columns) — a
// proxy for "how much data was loaded". Returns a getter for the totals.
function instrumentDataSource(ds: DataSource) {
  const counters = { queries: 0, selectQueries: 0, rows: 0, cells: 0 };
  const origCreate = ds.createQueryRunner.bind(ds);
  (ds as any).createQueryRunner = (...args: any[]) => {
    const qr: any = origCreate(...args);
    const origQ = qr.query.bind(qr);
    qr.query = async (...qa: any[]) => {
      const sql = typeof qa[0] === 'string' ? qa[0] : qa[0]?.text;
      const res = await origQ(...qa);
      counters.queries++;
      if (sql && /^\s*SELECT/i.test(sql)) {
        counters.selectQueries++;
        const rows = Array.isArray(res)
          ? res
          : (res?.records ?? res?.rows ?? res?.raw ?? []);
        if (Array.isArray(rows) && rows.length > 0) {
          counters.rows += rows.length;
          counters.cells += rows.length * Object.keys(rows[0]).length;
        }
      }
      return res;
    };
    return qr;
  };
  return counters;
}

// Stable serialization of the computed policies so two runs (e.g. before/after
// the auth-load trimming) can be diffed to prove the reset output is unchanged.
function serializePolicies(policies: { id?: string }[]): string {
  const norm = (rules: any[] | undefined) =>
    (rules ?? [])
      .map(r => ({
        name: r.name,
        cascade: r.cascade,
        grantedPrivileges: [...(r.grantedPrivileges ?? [])].sort(),
        criterias: (r.criterias ?? [])
          .map((c: any) => `${c.type}:${c.resourceID ?? ''}`)
          .sort(),
        sourcePrivilege: r.sourcePrivilege,
      }))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const out = policies
    .map((p: any) => ({
      id: p.id,
      type: p.type,
      credentialRules: norm(p.credentialRules),
      privilegeRules: norm(p.privilegeRules),
      verifiedCredentialRules: norm(p.verifiedCredentialRules),
    }))
    .sort((a, b) => (a.id ?? '').localeCompare(b.id ?? ''));
  return JSON.stringify(out, null, 2);
}

async function main() {
  const spaceId = process.argv[2];
  const save = process.argv.includes('--save');
  if (!spaceId) {
    process.stderr.write('Usage: run-space-auth-reset.ts <spaceId> [--save]\n');
    process.exitCode = 1;
    return;
  }

  const start = Date.now();
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const spaceAuth = app.get(SpaceAuthorizationService, { strict: false });
    const authPolicyService = app.get(AuthorizationPolicyService, {
      strict: false,
    });
    const measure = process.argv.includes('--measure');
    const counters = measure
      ? instrumentDataSource(app.get(DataSource, { strict: false }))
      : null;

    process.stdout.write(`Running auth reset for space ${spaceId} ...\n`);
    const updated = await spaceAuth.applyAuthorizationPolicy(spaceId);
    if (counters) {
      process.stdout.write(
        `MEASURE queries=${counters.queries} selects=${counters.selectQueries} rows=${counters.rows} cells=${counters.cells}\n`
      );
    }
    process.stdout.write(
      `OK: reset completed, ${updated.length} authorization policies computed in ${Date.now() - start}ms\n`
    );

    const dumpPath = process.env.AUTH_RESET_DUMP;
    if (dumpPath) {
      writeFileSync(dumpPath, serializePolicies(updated), 'utf-8');
      process.stdout.write(`Serialized policies written to ${dumpPath}\n`);
    }

    if (save) {
      await authPolicyService.saveAll(updated);
      process.stdout.write(`Saved ${updated.length} policies.\n`);
    } else {
      process.stdout.write('(--save not set: child policies not persisted)\n');
    }
  } catch (err) {
    process.stderr.write(`FAILED: ${(err as Error).message}\n`);
    process.stderr.write(`${(err as Error).stack}\n`);
    process.exitCode = 1;
  } finally {
    await app.close().catch(() => undefined);
    setImmediate(() => process.exit(process.exitCode ?? 0));
  }
}

main();
