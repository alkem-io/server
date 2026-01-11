import { MigrationInterface, QueryRunner } from 'typeorm';

export class UnifyVirtualNaming1766840693000 implements MigrationInterface {
  name = 'UnifyVirtualNaming1766840693000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Unify all 'virtual-contributor' values to 'virtual' across the database
    // This ensures consistency with RoleSetContributorType.VIRTUAL = 'virtual'

    // Step 1: Add 'virtual' to profile_type_enum if not exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'virtual'
          AND enumtypid = 'public.profile_type_enum'::regtype
        ) THEN
          ALTER TYPE "public"."profile_type_enum" ADD VALUE 'virtual';
        END IF;
      END $$;
    `);

    // Step 2: Update all profiles with type 'virtual-contributor' to 'virtual'
    await queryRunner.query(`
      UPDATE "profile"
      SET "type" = 'virtual'
      WHERE "type" = 'virtual-contributor'
    `);

    // Note: We cannot remove 'virtual-contributor' from the enum in PostgreSQL
    // without recreating the type. It will remain unused but harmless.
    console.log(
      '[Migration] Updated profile_type_enum: migrated virtual-contributor -> virtual'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert profiles back to 'virtual-contributor'
    await queryRunner.query(`
      UPDATE "profile"
      SET "type" = 'virtual-contributor'
      WHERE "type" = 'virtual'
    `);

    console.log(
      '[Migration] Reverted profile_type_enum: migrated virtual -> virtual-contributor'
    );
  }
}
