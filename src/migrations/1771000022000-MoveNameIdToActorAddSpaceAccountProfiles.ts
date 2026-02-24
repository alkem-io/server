import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MoveNameIdToActorAddSpaceAccountProfiles1771000022000
  implements MigrationInterface
{
  name = 'MoveNameIdToActorAddSpaceAccountProfiles1771000022000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- Step 1: Add nameID column to actor table ---
    await queryRunner.query(
      `ALTER TABLE "actor" ADD "nameID" varchar(36)`
    );

    // --- Step 2: Copy nameID from each child table to actor ---
    await queryRunner.query(
      `UPDATE "actor" SET "nameID" = "user"."nameID" FROM "user" WHERE "actor"."id" = "user"."id"`
    );
    await queryRunner.query(
      `UPDATE "actor" SET "nameID" = "organization"."nameID" FROM "organization" WHERE "actor"."id" = "organization"."id"`
    );
    await queryRunner.query(
      `UPDATE "actor" SET "nameID" = "virtual_contributor"."nameID" FROM "virtual_contributor" WHERE "actor"."id" = "virtual_contributor"."id"`
    );
    await queryRunner.query(
      `UPDATE "actor" SET "nameID" = "space"."nameID" FROM "space" WHERE "actor"."id" = "space"."id"`
    );
    await queryRunner.query(
      `UPDATE "actor" SET "nameID" = "account"."nameID" FROM "account" WHERE "actor"."id" = "account"."id"`
    );

    // --- Step 3: Handle orphan actors without nameID ---
    await queryRunner.query(
      `UPDATE "actor" SET "nameID" = CONCAT('actor-', SUBSTRING(id::text, 1, 8)) WHERE "nameID" IS NULL`
    );

    // --- Step 4: Make nameID NOT NULL ---
    await queryRunner.query(
      `ALTER TABLE "actor" ALTER COLUMN "nameID" SET NOT NULL`
    );

    // --- Step 5: Add 'space' and 'account' to profile_type_enum ---
    await queryRunner.query(
      `ALTER TYPE "public"."profile_type_enum" ADD VALUE IF NOT EXISTS 'space'`
    );
    await queryRunner.query(
      `ALTER TYPE "public"."profile_type_enum" ADD VALUE IF NOT EXISTS 'account'`
    );

    // --- Step 6: Create minimal profiles for Space actors without profiles ---
    // Use DO block to handle the INSERT + UPDATE atomically
    await queryRunner.query(`
      DO $$
      DECLARE
        rec RECORD;
        new_profile_id uuid;
        new_auth_id uuid;
      BEGIN
        FOR rec IN
          SELECT a."id" as actor_id,
            COALESCE(p2."displayName", a."nameID") as display_name
          FROM "actor" a
          INNER JOIN "space" s ON s."id" = a."id"
          LEFT JOIN "space_about" sa ON sa."id" = s."aboutId"
          LEFT JOIN "profile" p2 ON p2."id" = sa."profileId"
          WHERE a."profileId" IS NULL
        LOOP
          new_profile_id := gen_random_uuid();
          new_auth_id := gen_random_uuid();

          INSERT INTO "authorization_policy" ("id", "createdDate", "updatedDate", "version", "credentialRules", "privilegeRules", "type")
          VALUES (new_auth_id, NOW(), NOW(), 1, '[]'::jsonb, '[]'::jsonb, 'profile');

          INSERT INTO "profile" ("id", "createdDate", "updatedDate", "version", "displayName", "type", "authorizationId")
          VALUES (new_profile_id, NOW(), NOW(), 1, rec.display_name, 'space', new_auth_id);

          UPDATE "actor" SET "profileId" = new_profile_id WHERE "id" = rec.actor_id;
        END LOOP;
      END $$;
    `);

    // --- Step 7: Create minimal profiles for Account actors without profiles ---
    await queryRunner.query(`
      DO $$
      DECLARE
        rec RECORD;
        new_profile_id uuid;
        new_auth_id uuid;
      BEGIN
        FOR rec IN
          SELECT a."id" as actor_id, a."nameID" as display_name
          FROM "actor" a
          INNER JOIN "account" acc ON acc."id" = a."id"
          WHERE a."profileId" IS NULL
        LOOP
          new_profile_id := gen_random_uuid();
          new_auth_id := gen_random_uuid();

          INSERT INTO "authorization_policy" ("id", "createdDate", "updatedDate", "version", "credentialRules", "privilegeRules", "type")
          VALUES (new_auth_id, NOW(), NOW(), 1, '[]'::jsonb, '[]'::jsonb, 'profile');

          INSERT INTO "profile" ("id", "createdDate", "updatedDate", "version", "displayName", "type", "authorizationId")
          VALUES (new_profile_id, NOW(), NOW(), 1, rec.display_name, 'account', new_auth_id);

          UPDATE "actor" SET "profileId" = new_profile_id WHERE "id" = rec.actor_id;
        END LOOP;
      END $$;
    `);

    // --- Step 8: Add per-type unique indexes on actor.nameID ---
    // These replace the unique constraints that were on child tables
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_actor_nameID_user" ON "actor" ("nameID") WHERE "type" = 'user'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_actor_nameID_organization" ON "actor" ("nameID") WHERE "type" = 'organization'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_actor_nameID_virtual_contributor" ON "actor" ("nameID") WHERE "type" = 'virtual-contributor'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_actor_nameID_account" ON "actor" ("nameID") WHERE "type" = 'account'`
    );
    // Space: no unique index — nameID uniqueness depends on levelZeroSpaceID, enforced by app logic

    // --- Step 9: Drop nameID columns from child tables ---
    // Drop unique constraints first (TypeORM auto-generates these names)
    const tables = ['user', 'organization', 'virtual_contributor', 'account'];
    for (const table of tables) {
      // Find and drop any unique constraint on nameID
      const constraints: { constraint_name: string }[] =
        await queryRunner.query(
          `SELECT con.conname as constraint_name
           FROM pg_constraint con
           JOIN pg_attribute att ON att.attnum = ANY(con.conkey) AND att.attrelid = con.conrelid
           WHERE con.conrelid = '"${table}"'::regclass
             AND att.attname = 'nameID'
             AND con.contype = 'u'`
        );
      for (const { constraint_name } of constraints) {
        await queryRunner.query(
          `ALTER TABLE "${table}" DROP CONSTRAINT "${constraint_name}"`
        );
      }
    }

    // Drop the columns
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "nameID"`);
    await queryRunner.query(
      `ALTER TABLE "organization" DROP COLUMN "nameID"`
    );
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" DROP COLUMN "nameID"`
    );
    await queryRunner.query(`ALTER TABLE "space" DROP COLUMN "nameID"`);
    await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "nameID"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // --- Reverse Step 9: Re-add nameID columns to child tables ---
    await queryRunner.query(
      `ALTER TABLE "user" ADD "nameID" varchar(36)`
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ADD "nameID" varchar(36)`
    );
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" ADD "nameID" varchar(36)`
    );
    await queryRunner.query(
      `ALTER TABLE "space" ADD "nameID" varchar(36)`
    );
    await queryRunner.query(
      `ALTER TABLE "account" ADD "nameID" varchar(36)`
    );

    // Copy nameID back from actor to child tables
    await queryRunner.query(
      `UPDATE "user" SET "nameID" = "actor"."nameID" FROM "actor" WHERE "user"."id" = "actor"."id"`
    );
    await queryRunner.query(
      `UPDATE "organization" SET "nameID" = "actor"."nameID" FROM "actor" WHERE "organization"."id" = "actor"."id"`
    );
    await queryRunner.query(
      `UPDATE "virtual_contributor" SET "nameID" = "actor"."nameID" FROM "actor" WHERE "virtual_contributor"."id" = "actor"."id"`
    );
    await queryRunner.query(
      `UPDATE "space" SET "nameID" = "actor"."nameID" FROM "actor" WHERE "space"."id" = "actor"."id"`
    );
    await queryRunner.query(
      `UPDATE "account" SET "nameID" = "actor"."nameID" FROM "actor" WHERE "account"."id" = "actor"."id"`
    );

    // Make NOT NULL and add unique constraints back
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "nameID" SET NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "UQ_user_nameID" UNIQUE ("nameID")`
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ALTER COLUMN "nameID" SET NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ADD CONSTRAINT "UQ_organization_nameID" UNIQUE ("nameID")`
    );
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" ALTER COLUMN "nameID" SET NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" ADD CONSTRAINT "UQ_virtual_contributor_nameID" UNIQUE ("nameID")`
    );
    await queryRunner.query(
      `ALTER TABLE "space" ALTER COLUMN "nameID" SET NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "account" ALTER COLUMN "nameID" SET NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "account" ADD CONSTRAINT "UQ_account_nameID" UNIQUE ("nameID")`
    );

    // --- Reverse Step 8: Drop per-type unique indexes ---
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_actor_nameID_user"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_actor_nameID_organization"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_actor_nameID_virtual_contributor"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_actor_nameID_account"`
    );

    // --- Reverse Steps 6-7: Remove created profiles for Space/Account ---
    // Delete profiles that were created for space/account actors
    await queryRunner.query(
      `DELETE FROM "profile" WHERE "type" = 'space' AND "id" IN (
        SELECT a."profileId" FROM "actor" a
        INNER JOIN "space" s ON s."id" = a."id"
      )`
    );
    await queryRunner.query(
      `DELETE FROM "profile" WHERE "type" = 'account' AND "id" IN (
        SELECT a."profileId" FROM "actor" a
        INNER JOIN "account" acc ON acc."id" = a."id"
      )`
    );

    // Set profileId to NULL for space/account actors
    await queryRunner.query(
      `UPDATE "actor" SET "profileId" = NULL
       WHERE "id" IN (SELECT s."id" FROM "space" s)
         AND "profileId" NOT IN (
           SELECT a2."profileId" FROM "actor" a2
           INNER JOIN "user" u ON u."id" = a2."id"
           WHERE a2."profileId" IS NOT NULL
         )`
    );
    await queryRunner.query(
      `UPDATE "actor" SET "profileId" = NULL
       WHERE "id" IN (SELECT acc."id" FROM "account" acc)
         AND "profileId" IS NOT NULL`
    );

    // --- Reverse Step 4+1: Drop nameID from actor ---
    await queryRunner.query(`ALTER TABLE "actor" DROP COLUMN "nameID"`);

    // Note: profile_type_enum values 'space' and 'account' cannot be easily removed
    // from PostgreSQL enums without recreating the type. Left in place.
  }
}
