import { describe, expect, it, vi } from 'vitest';
import { CreateDevicePushTokenTable1790800000000 } from '../1790800000000-CreateDevicePushTokenTable';

/**
 * SC-018. Mocked-QueryRunner assertions over the emitted SQL — no database
 * needed (same approach as 1790700000000-AddCalloutForm.spec.ts:13-35).
 *
 * This is the only executable proof of FR-001's two prose constraints: the new
 * table carries its UNIQUE index and its NAMED cascade FK, and no statement
 * touches a pre-existing table. The entity-file `git diff` gate leg guards
 * `push.subscription.entity.ts` and says nothing about migration SQL.
 */
describe('CreateDevicePushTokenTable migration (1790800000000)', () => {
  const statements = async () => {
    const queryRunner = { query: vi.fn().mockResolvedValue(undefined) };
    await new CreateDevicePushTokenTable1790800000000().up(queryRunner as any);
    return queryRunner.query.mock.calls.map(([q]) => q as string);
  };

  it('creates exactly one table, and it is device_push_token', async () => {
    const sql = (await statements()).join('\n');
    expect(sql.match(/CREATE TABLE /g)).toHaveLength(1);
    expect(sql).toMatch(/CREATE TABLE "device_push_token" \(/);
  });

  it('creates the UNIQUE index under the name the entity declares', async () => {
    const sql = (await statements()).join('\n');
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX "IDX_device_push_token_token" ON "device_push_token" \("token"\)/
    );
  });

  it('names the FK and cascades it from the user', async () => {
    const sql = (await statements()).join('\n');
    expect(sql).toMatch(
      /CONSTRAINT "FK_device_push_token_userId" FOREIGN KEY \("userId"\) REFERENCES "user"\("id"\) ON DELETE CASCADE/
    );
  });

  it('matches BaseAlkemioEntity: timestamptz timestamps and a version with no DEFAULT', async () => {
    const sql = (await statements()).join('\n');
    expect(sql).toMatch(
      /"createdDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now\(\)/
    );
    expect(sql).toMatch(
      /"updatedDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now\(\)/
    );
    expect(sql).toMatch(/"version" integer NOT NULL,/);
    expect(sql).not.toMatch(/"version" integer NOT NULL DEFAULT/);
  });

  it('alters no pre-existing table', async () => {
    const sql = (await statements()).join('\n');
    expect(sql).not.toMatch(/ALTER TABLE "(?!device_push_token)/);
  });

  it('down() drops the table and nothing else', async () => {
    const queryRunner = { query: vi.fn().mockResolvedValue(undefined) };
    await new CreateDevicePushTokenTable1790800000000().down(
      queryRunner as any
    );
    expect(queryRunner.query.mock.calls.map(([q]) => q)).toEqual([
      'DROP TABLE "device_push_token"',
    ]);
  });
});
