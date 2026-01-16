import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertVarchar36ToUuid1767884877005 implements MigrationInterface {
  private readonly NIL_UUID = '00000000-0000-0000-0000-000000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // communication.spaceID: Has empty strings, convert to NULL (nullable column)
    // First drop NOT NULL constraint, then update, then convert type
    await queryRunner.query(
      `ALTER TABLE "communication" ALTER COLUMN "spaceID" DROP NOT NULL`
    );
    await queryRunner.query(
      `UPDATE "communication" SET "spaceID" = NULL WHERE "spaceID" = ''`
    );
    await queryRunner.query(
      `ALTER TABLE "communication" ALTER COLUMN "spaceID" TYPE uuid USING "spaceID"::uuid`
    );

    // community.parentID: No empty strings, just convert type
    await queryRunner.query(
      `ALTER TABLE "community" ALTER COLUMN "parentID" TYPE uuid USING "parentID"::uuid`
    );

    // credential.resourceID: Has empty strings, convert to nil UUID (non-nullable)
    await queryRunner.query(
      `UPDATE "credential" SET "resourceID" = '${this.NIL_UUID}' WHERE "resourceID" = ''`
    );
    await queryRunner.query(
      `ALTER TABLE "credential" ALTER COLUMN "resourceID" TYPE uuid USING "resourceID"::uuid`
    );

    // organization_verification.organizationID: No empty strings, just convert type
    await queryRunner.query(
      `ALTER TABLE "organization_verification" ALTER COLUMN "organizationID" TYPE uuid USING "organizationID"::uuid`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert communication.spaceID
    await queryRunner.query(
      `ALTER TABLE "communication" ALTER COLUMN "spaceID" TYPE varchar(36) USING "spaceID"::varchar(36)`
    );
    await queryRunner.query(
      `UPDATE "communication" SET "spaceID" = '' WHERE "spaceID" IS NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "communication" ALTER COLUMN "spaceID" SET NOT NULL`
    );

    // Revert community.parentID
    await queryRunner.query(
      `ALTER TABLE "community" ALTER COLUMN "parentID" TYPE varchar(36) USING "parentID"::varchar(36)`
    );

    // Revert credential.resourceID
    await queryRunner.query(
      `ALTER TABLE "credential" ALTER COLUMN "resourceID" TYPE varchar(36) USING "resourceID"::varchar(36)`
    );
    await queryRunner.query(
      `UPDATE "credential" SET "resourceID" = '' WHERE "resourceID" = '${this.NIL_UUID}'`
    );

    // Revert organization_verification.organizationID
    await queryRunner.query(
      `ALTER TABLE "organization_verification" ALTER COLUMN "organizationID" TYPE varchar(36) USING "organizationID"::varchar(36)`
    );
  }
}
