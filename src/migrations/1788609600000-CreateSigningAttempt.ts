import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSigningAttempt1788609600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "signing_attempt_status_enum" AS ENUM (
        'pending', 'signed', 'cancelled', 'failed', 'expired'
      );
      CREATE TABLE "signing_attempt" (
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
      );
      CREATE INDEX "IDX_signing_attempt_memo_status" ON "signing_attempt" ("memoId", "status");
      CREATE INDEX "IDX_signing_attempt_status_expiresAt" ON "signing_attempt" ("status", "expiresAt");
      CREATE INDEX "IDX_signing_attempt_status_createdDate" ON "signing_attempt" ("status", "createdDate");
      CREATE INDEX "IDX_signing_attempt_snapshotDocumentId" ON "signing_attempt" ("snapshotDocumentId");
      CREATE INDEX "IDX_signing_attempt_signedDocumentId" ON "signing_attempt" ("signedDocumentId");
      CREATE UNIQUE INDEX "UQ_signing_attempt_correlationId" ON "signing_attempt" ("correlationId");
      CREATE UNIQUE INDEX "UQ_signing_attempt_clientStateHash" ON "signing_attempt" ("clientStateHash")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "signing_attempt"; DROP TYPE "signing_attempt_status_enum"');
  }
}
