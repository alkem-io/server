import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSigningAttempt1788609600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "signing_attempt_status_enum" AS ENUM ('pending', 'signed', 'cancelled', 'failed', 'expired');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "signing_attempt" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdDate" timestamptz NOT NULL DEFAULT now(),
        "updatedDate" timestamptz NOT NULL DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1,
        "memoId" uuid NOT NULL,
        "actorId" uuid NOT NULL,
        "contentSha256" varchar(64),
        "snapshotDocumentId" uuid,
        "correlationId" text,
        "expiresAt" timestamptz,
        "clientStateHash" varchar(64),
        "status" "signing_attempt_status_enum" NOT NULL DEFAULT 'pending',
        "signedDocumentId" uuid,
        "signerEvidence" jsonb,
        CONSTRAINT "PK_signing_attempt" PRIMARY KEY ("id"),
        CONSTRAINT "FK_signing_attempt_memoId" FOREIGN KEY ("memoId") REFERENCES "memo"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_signing_attempt_snapshotDocumentId" FOREIGN KEY ("snapshotDocumentId") REFERENCES "file"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_signing_attempt_signedDocumentId" FOREIGN KEY ("signedDocumentId") REFERENCES "file"("id") ON DELETE RESTRICT
      )
    `);
    for (const statement of [
      `CREATE INDEX IF NOT EXISTS "IDX_signing_attempt_memo_status" ON "signing_attempt" ("memoId", "status")`,
      `CREATE INDEX IF NOT EXISTS "IDX_signing_attempt_status_expiresAt" ON "signing_attempt" ("status", "expiresAt")`,
      `CREATE INDEX IF NOT EXISTS "IDX_signing_attempt_status_createdDate" ON "signing_attempt" ("status", "createdDate")`,
      `CREATE INDEX IF NOT EXISTS "IDX_signing_attempt_snapshotDocumentId" ON "signing_attempt" ("snapshotDocumentId")`,
      `CREATE INDEX IF NOT EXISTS "IDX_signing_attempt_signedDocumentId" ON "signing_attempt" ("signedDocumentId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_signing_attempt_correlationId" ON "signing_attempt" ("correlationId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_signing_attempt_clientStateHash" ON "signing_attempt" ("clientStateHash")`,
    ])
      await queryRunner.query(statement);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Destructive rollback deletes attempt records, not referenced file rows.
    await queryRunner.query(`DROP TABLE IF EXISTS "signing_attempt"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "signing_attempt_status_enum"`);
  }
}
