import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Consolidated migration for user identity cleanup:
 *
 * Before State:
 * - user table: has accountUpn (varchar(128), NOT NULL, UNIQUE), communicationID (varchar, NOT NULL)
 * - virtual_contributor table: has communicationID (varchar, NOT NULL)
 * - organization table: has communicationID (varchar, NOT NULL)
 *
 * After State:
 * - user table: has authenticationID (uuid, NULLABLE, UNIQUE CONSTRAINT + INDEX), no accountUpn, no communicationID
 * - virtual_contributor table: no communicationID
 * - organization table: no communicationID
 *
 * This migration:
 * 1. Adds authenticationID column to user table with unique constraint and index
 * 2. Drops accountUpn column and its unique constraint from user table
 * 3. Drops communicationID from user, virtual_contributor, and organization tables
 */
export class UserIdentityCleanup1764590889000 implements MigrationInterface {
  name = 'UserIdentityCleanup1764590889000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add authenticationID to user table with proper UNIQUE CONSTRAINT + INDEX
    await queryRunner.query(`ALTER TABLE "user" ADD "authenticationID" uuid`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "UQ_0742ec75e9fc10a1e393a3ef4c7" UNIQUE ("authenticationID")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0742ec75e9fc10a1e393a3ef4c" ON "user" ("authenticationID")`
    );

    // 2. Drop accountUpn from user table
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "UQ_c09b537a5d76200c622a0fd0b70"`
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "accountUpn"`);

    // 3. Drop communicationID from contributor tables
    await queryRunner.query('ALTER TABLE "user" DROP COLUMN "communicationID"');
    await queryRunner.query(
      'ALTER TABLE "virtual_contributor" DROP COLUMN "communicationID"'
    );
    await queryRunner.query(
      'ALTER TABLE "organization" DROP COLUMN "communicationID"'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 3. Re-add communicationID to contributor tables
    await queryRunner.query(
      'ALTER TABLE "organization" ADD "communicationID" character varying NOT NULL DEFAULT \'\''
    );
    await queryRunner.query(
      'ALTER TABLE "virtual_contributor" ADD "communicationID" character varying NOT NULL DEFAULT \'\''
    );
    await queryRunner.query(
      'ALTER TABLE "user" ADD "communicationID" character varying NOT NULL DEFAULT \'\''
    );

    // 2. Re-add accountUpn to user table
    await queryRunner.query(
      `ALTER TABLE "user" ADD "accountUpn" character varying(128)`
    );
    await queryRunner.query(`UPDATE "user" SET "accountUpn" = "email"`);
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "accountUpn" SET NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "UQ_c09b537a5d76200c622a0fd0b70" UNIQUE ("accountUpn")`
    );

    // 1. Remove authenticationID from user table
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0742ec75e9fc10a1e393a3ef4c"`
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "UQ_0742ec75e9fc10a1e393a3ef4c7"`
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "authenticationID"`
    );
  }
}
