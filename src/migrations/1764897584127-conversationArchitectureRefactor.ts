import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Consolidated migration for conversation architecture refactor.
 *
 * Before State:
 * - user table: has authenticationID (uuid, UNIQUE CONSTRAINT + INDEX), conversationsSetId (uuid, FK)
 * - conversation table: has type (varchar(128), NOT NULL, DEFAULT 'user-user'), userID (uuid),
 *                       virtualContributorID (uuid), wellKnownVirtualContributor (varchar(128))
 * - virtual_contributor table: does NOT have wellKnownVirtualContributor
 * - room table: has externalRoomID (varchar, NOT NULL), does NOT have vcInteractionsByThread
 * - platform table: does NOT have conversationsSetId
 * - vc_interaction table: EXISTS
 * - conversation_membership table: does NOT EXIST
 * - conversations_set table: owned by users
 *
 * After State:
 * - user table: has authenticationID (uuid, UNIQUE CONSTRAINT + INDEX), no conversationsSetId
 * - conversation table: no type, userID, virtualContributorID, wellKnownVirtualContributor
 * - virtual_contributor table: no wellKnownVirtualContributor
 * - room table: no externalRoomID, has vcInteractionsByThread (jsonb, NOT NULL, DEFAULT '{}')
 * - platform table: has conversationsSetId (uuid, UNIQUE, FK to conversations_set)
 * - vc_interaction table: DROPPED
 * - conversation_membership table: EXISTS (with FKs to conversation and agent)
 * - conversations_set table: orphans removed, owned by platform
 *
 * This migration:
 * 1. Creates conversation_membership pivot table with FKs
 * 2. Migrates conversation participants to conversation_membership:
 *    A) USER_VC conversations (direct virtualContributorID): insert user agent + VC agent
 *    A') USER_VC conversations (wellKnownVirtualContributor): resolve via platform mapping, insert user agent + VC agent
 *    B) USER_USER pairs (share externalRoomID): merge into one, insert both user agents
 *    C) Standalone USER_USER: insert single user agent
 * 3. Drops legacy conversation columns (type, userID, virtualContributorID, wellKnownVirtualContributor)
 * 4. Drops externalRoomID from room table
 * 5. Migrates vc_interaction data to room.vcInteractionsByThread JSONB column
 * 6. Drops vc_interaction table
 * 7. Moves conversationsSet ownership from user to platform:
 *    - Adds conversationsSetId column to platform table
 *    - If conversations exist: picks one existing conversations_set (or creates one if none),
 *      assigns to platform, moves all conversations to it, deletes other sets
 *    - If no conversations exist: deletes any orphaned conversations_set records,
 *      bootstrap will create platform's set
 *    - Drops conversationsSetId column from user table
 */
export class ConversationArchitectureRefactor1764897584127
  implements MigrationInterface
{
  name = 'ConversationArchitectureRefactor1764897584127';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create conversation_membership pivot table
    await queryRunner.query(
      `CREATE TABLE "conversation_membership" ("conversationId" uuid NOT NULL, "agentId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_42dca6e5549063cb4cee1ee1308" PRIMARY KEY ("conversationId", "agentId"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d348791d10e1f31c61d7f5bd2a" ON "conversation_membership" ("agentId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_285a9958dbcd10748d4470054d" ON "conversation_membership" ("conversationId") `
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_membership" ADD CONSTRAINT "FK_285a9958dbcd10748d4470054d5" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_membership" ADD CONSTRAINT "FK_d348791d10e1f31c61d7f5bd2a7" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // 2. Migrate conversation participants to conversation_membership
    // Count total conversations for logging
    const totalConversations = await queryRunner.query(
      `SELECT COUNT(*) as count FROM conversation`
    );
    console.log(
      `[Migration] Total conversations to process: ${totalConversations[0]?.count ?? 0}`
    );

    // 2A. USER_VC conversations: insert user agent + VC agent
    const userVcUserResult = await queryRunner.query(`
      INSERT INTO conversation_membership ("conversationId", "agentId")
      SELECT c.id, u."agentId"
      FROM conversation c
      JOIN "user" u ON c."userID" = u.id
      WHERE c."virtualContributorID" IS NOT NULL
    `);
    console.log(
      `[Migration] 2A: Inserted ${userVcUserResult[1] ?? 0} user agents for USER_VC conversations`
    );

    const userVcVcResult = await queryRunner.query(`
      INSERT INTO conversation_membership ("conversationId", "agentId")
      SELECT c.id, vc."agentId"
      FROM conversation c
      JOIN virtual_contributor vc ON c."virtualContributorID" = vc.id
      WHERE c."virtualContributorID" IS NOT NULL
    `);
    console.log(
      `[Migration] 2A: Inserted ${userVcVcResult[1] ?? 0} VC agents for USER_VC conversations`
    );

    // 2A'. USER_VC conversations using wellKnownVirtualContributor (resolved via platform mapping)
    // User membership first
    const wellKnownUserResult = await queryRunner.query(`
      INSERT INTO conversation_membership ("conversationId", "agentId")
      SELECT c.id, u."agentId"
      FROM conversation c
      JOIN "user" u ON c."userID" = u.id
      JOIN (
        SELECT key as wk_name, (value)::uuid as vc_id
        FROM platform, json_each_text("wellKnownVirtualContributors")
      ) p ON c."wellKnownVirtualContributor" = p.wk_name
      WHERE c."virtualContributorID" IS NULL
        AND c."wellKnownVirtualContributor" IS NOT NULL
    `);
    console.log(
      `[Migration] 2A': Inserted ${wellKnownUserResult[1] ?? 0} user agents for wellKnown USER_VC conversations`
    );

    // VC membership via wellKnownVirtualContributor
    const wellKnownVcResult = await queryRunner.query(`
      INSERT INTO conversation_membership ("conversationId", "agentId")
      SELECT c.id, vc."agentId"
      FROM conversation c
      JOIN (
        SELECT key as wk_name, (value)::uuid as vc_id
        FROM platform, json_each_text("wellKnownVirtualContributors")
      ) p ON c."wellKnownVirtualContributor" = p.wk_name
      JOIN virtual_contributor vc ON vc.id = p.vc_id
      WHERE c."virtualContributorID" IS NULL
        AND c."wellKnownVirtualContributor" IS NOT NULL
    `);
    console.log(
      `[Migration] 2A': Inserted ${wellKnownVcResult[1] ?? 0} VC agents for wellKnown USER_VC conversations`
    );

    // 2B. USER_USER pairs: find conversations sharing externalRoomID via their rooms
    // First, identify the pairs and insert memberships for the kept conversation
    const pairedInsertResult = await queryRunner.query(`
      WITH paired AS (
        SELECT
          c.id as conv_id,
          c."userID",
          r.id as room_id,
          r."externalRoomID",
          ROW_NUMBER() OVER (PARTITION BY r."externalRoomID" ORDER BY r.id) as rn
        FROM conversation c
        JOIN room r ON c."roomId" = r.id
        WHERE c."virtualContributorID" IS NULL
          AND r."externalRoomID" IS NOT NULL
          AND r."externalRoomID" != ''
      ),
      pairs_only AS (
        SELECT "externalRoomID"
        FROM paired
        GROUP BY "externalRoomID"
        HAVING COUNT(*) = 2
      )
      INSERT INTO conversation_membership ("conversationId", "agentId")
      SELECT DISTINCT p1.conv_id, u."agentId"
      FROM paired p1
      JOIN pairs_only po ON p1."externalRoomID" = po."externalRoomID"
      JOIN paired p2 ON p1."externalRoomID" = p2."externalRoomID"
      JOIN "user" u ON u.id IN (p1."userID", p2."userID")
      WHERE p1.rn = 1
    `);
    console.log(
      `[Migration] 2B: Inserted ${pairedInsertResult[1] ?? 0} memberships for USER_USER pairs`
    );

    // Delete the duplicate conversations (rn=2) - FK CASCADE will handle any memberships
    const deletedConversations = await queryRunner.query(`
      WITH paired AS (
        SELECT
          c.id as conv_id,
          r."externalRoomID",
          ROW_NUMBER() OVER (PARTITION BY r."externalRoomID" ORDER BY r.id) as rn
        FROM conversation c
        JOIN room r ON c."roomId" = r.id
        WHERE c."virtualContributorID" IS NULL
          AND r."externalRoomID" IS NOT NULL
          AND r."externalRoomID" != ''
      ),
      pairs_only AS (
        SELECT "externalRoomID"
        FROM paired
        GROUP BY "externalRoomID"
        HAVING COUNT(*) = 2
      )
      DELETE FROM conversation
      WHERE id IN (
        SELECT p.conv_id
        FROM paired p
        JOIN pairs_only po ON p."externalRoomID" = po."externalRoomID"
        WHERE p.rn = 2
      )
    `);
    console.log(
      `[Migration] 2B: Deleted ${deletedConversations[1] ?? 0} duplicate conversations`
    );

    // Delete the orphaned rooms (rn=2)
    const deletedRooms = await queryRunner.query(`
      WITH paired AS (
        SELECT
          c.id as conv_id,
          r.id as room_id,
          r."externalRoomID",
          ROW_NUMBER() OVER (PARTITION BY r."externalRoomID" ORDER BY r.id) as rn
        FROM conversation c
        JOIN room r ON c."roomId" = r.id
        WHERE c."virtualContributorID" IS NULL
          AND r."externalRoomID" IS NOT NULL
          AND r."externalRoomID" != ''
      ),
      pairs_only AS (
        SELECT "externalRoomID"
        FROM paired
        GROUP BY "externalRoomID"
        HAVING COUNT(*) = 2
      )
      DELETE FROM room
      WHERE id IN (
        SELECT p.room_id
        FROM paired p
        JOIN pairs_only po ON p."externalRoomID" = po."externalRoomID"
        WHERE p.rn = 2
      )
    `);
    console.log(
      `[Migration] 2B: Deleted ${deletedRooms[1] ?? 0} orphaned rooms`
    );

    // 2C. Standalone USER_USER: insert single user agent (those not yet in conversation_membership)
    const standaloneResult = await queryRunner.query(`
      INSERT INTO conversation_membership ("conversationId", "agentId")
      SELECT c.id, u."agentId"
      FROM conversation c
      JOIN "user" u ON c."userID" = u.id
      WHERE c."virtualContributorID" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM conversation_membership cm WHERE cm."conversationId" = c.id
        )
    `);
    console.log(
      `[Migration] 2C: Inserted ${standaloneResult[1] ?? 0} memberships for standalone USER_USER conversations`
    );

    // 2D. Check for any orphan conversations (not matching A, B, or C)
    const orphanConversations = await queryRunner.query(`
      SELECT c.id, c."userID", c."virtualContributorID"
      FROM conversation c
      WHERE NOT EXISTS (
        SELECT 1 FROM conversation_membership cm WHERE cm."conversationId" = c.id
      )
    `);
    if (orphanConversations.length > 0) {
      console.warn(
        `[Migration] WARNING: Found ${orphanConversations.length} conversations without memberships:`,
        orphanConversations.map((c: { id: string }) => c.id)
      );
    } else {
      console.log(
        `[Migration] 2D: All conversations have memberships - no orphans found`
      );
    }

    // 3. Drop legacy conversation columns
    await queryRunner.query(`ALTER TABLE "conversation" DROP COLUMN "type"`);
    await queryRunner.query(`ALTER TABLE "conversation" DROP COLUMN "userID"`);
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP COLUMN "virtualContributorID"`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP COLUMN "wellKnownVirtualContributor"`
    );

    // 4. Drop externalRoomID from room table
    await queryRunner.query('ALTER TABLE "room" DROP COLUMN "externalRoomID"');

    // 5. Add vcInteractionsByThread JSONB column to room and migrate data from vc_interaction
    await queryRunner.query(
      `ALTER TABLE "room" ADD "vcInteractionsByThread" jsonb NOT NULL DEFAULT '{}'`
    );
    await queryRunner.query(`
      UPDATE room r
      SET "vcInteractionsByThread" = COALESCE(
        (
          SELECT jsonb_object_agg(
            vi."threadID",
            jsonb_build_object(
              'virtualContributorActorID', a.id,
              'externalThreadId', CASE
                WHEN vi."externalMetadata" IS NOT NULL AND vi."externalMetadata"::jsonb->>'threadId' IS NOT NULL
                THEN vi."externalMetadata"::jsonb->>'threadId'
                ELSE NULL
              END
            )
          )
          FROM vc_interaction vi
          JOIN virtual_contributor vc ON vi."virtualContributorID" = vc.id
          JOIN agent a ON vc."agentId" = a.id
          WHERE vi."roomId" = r.id
        ),
        '{}'::jsonb
      )
      WHERE EXISTS (
        SELECT 1 FROM vc_interaction vi WHERE vi."roomId" = r.id
      )
    `);

    // 6. Drop vc_interaction table
    await queryRunner.query(`DROP TABLE IF EXISTS "vc_interaction"`);

    // 7. Move conversationsSet ownership from user to platform
    // 7a. Add conversationsSetId column to platform table first
    await queryRunner.query(
      `ALTER TABLE "platform" ADD "conversationsSetId" uuid`
    );
    await queryRunner.query(
      `ALTER TABLE "platform" ADD CONSTRAINT "UQ_dc8bdff7728d61097c8560ae7a9" UNIQUE ("conversationsSetId")`
    );
    await queryRunner.query(
      `ALTER TABLE "platform" ADD CONSTRAINT "FK_dc8bdff7728d61097c8560ae7a9" FOREIGN KEY ("conversationsSetId") REFERENCES "conversations_set"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // 7b. Check if there are any existing conversations (only migrate data if conversations exist)
    const existingConversations = await queryRunner.query(
      `SELECT id FROM conversation LIMIT 1`
    );

    if (existingConversations.length > 0) {
      // There are existing conversations - we need to migrate data
      // Pick one existing conversations_set or create one if none exist
      const existingConversationsSets = await queryRunner.query(
        `SELECT id FROM conversations_set LIMIT 1`
      );

      let platformConversationsSetId: string;

      if (existingConversationsSets.length > 0) {
        platformConversationsSetId = existingConversationsSets[0].id;
      } else {
        // Edge case: conversations exist but no conversations_set (data inconsistency)
        // Create a new conversations_set for platform
        const newSet = await queryRunner.query(
          `INSERT INTO conversations_set ("id", "createdDate", "updatedDate")
           VALUES (uuid_generate_v4(), now(), now())
           RETURNING id`
        );
        platformConversationsSetId = newSet[0].id;
      }

      // Assign the conversations_set to platform
      await queryRunner.query(
        `UPDATE "platform" SET "conversationsSetId" = $1`,
        [platformConversationsSetId]
      );

      // Move all conversations to the platform's conversations_set
      await queryRunner.query(
        `UPDATE "conversation" SET "conversationsSetId" = $1`,
        [platformConversationsSetId]
      );

      // Delete all other orphaned conversations_set records (keep only platform's)
      await queryRunner.query(`DELETE FROM conversations_set WHERE id != $1`, [
        platformConversationsSetId,
      ]);
    } else {
      // No conversations exist - delete any orphaned conversations_set records
      // Bootstrap will create a fresh conversations_set for platform
      await queryRunner.query(`DELETE FROM conversations_set`);
    }

    // 7c. Drop FK and column from user table
    const fkConstraints = await queryRunner.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'user'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%conversationsSet%'
    `);
    for (const constraint of fkConstraints) {
      await queryRunner.query(
        `ALTER TABLE "user" DROP CONSTRAINT "${constraint.constraint_name}"`
      );
    }
    const columnExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'user'
        AND column_name = 'conversationsSetId'
    `);
    if (columnExists.length > 0) {
      await queryRunner.query(
        `ALTER TABLE "user" DROP COLUMN "conversationsSetId"`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 7. Move conversationsSet ownership from platform back to user
    await queryRunner.query(`ALTER TABLE "user" ADD "conversationsSetId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_user_conversationsSet" FOREIGN KEY ("conversationsSetId") REFERENCES "conversations_set"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE "platform" DROP CONSTRAINT "FK_dc8bdff7728d61097c8560ae7a9"`
    );
    await queryRunner.query(
      `ALTER TABLE "platform" DROP CONSTRAINT "UQ_dc8bdff7728d61097c8560ae7a9"`
    );
    await queryRunner.query(
      `ALTER TABLE "platform" DROP COLUMN "conversationsSetId"`
    );

    // 6. Recreate vc_interaction table
    await queryRunner.query(`
      CREATE TABLE "vc_interaction" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "authorizationId" uuid,
        "threadID" character varying NOT NULL,
        "virtualContributorID" uuid NOT NULL,
        "roomId" uuid NOT NULL,
        "externalMetadata" text,
        CONSTRAINT "PK_vc_interaction" PRIMARY KEY ("id")
      )
    `);

    // 5. Migrate data back from room.vcInteractionsByThread to vc_interaction
    await queryRunner.query(`
      INSERT INTO vc_interaction ("threadID", "virtualContributorID", "roomId", "externalMetadata")
      SELECT
        thread_data.key AS "threadID",
        vc.id AS "virtualContributorID",
        r.id AS "roomId",
        CASE
          WHEN thread_data.value->>'externalThreadId' IS NOT NULL
          THEN jsonb_build_object('threadId', thread_data.value->>'externalThreadId')::text
          ELSE NULL
        END AS "externalMetadata"
      FROM room r
      CROSS JOIN LATERAL jsonb_each(r."vcInteractionsByThread") AS thread_data(key, value)
      JOIN agent a ON a.id = (thread_data.value->>'virtualContributorActorID')::uuid
      JOIN virtual_contributor vc ON vc."agentId" = a.id
      WHERE r."vcInteractionsByThread" IS NOT NULL
        AND r."vcInteractionsByThread" != '{}'::jsonb
    `);
    await queryRunner.query(
      `ALTER TABLE "room" DROP COLUMN "vcInteractionsByThread"`
    );

    // 4. Re-add externalRoomID to room table
    await queryRunner.query(
      'ALTER TABLE "room" ADD "externalRoomID" character varying NOT NULL DEFAULT \'\''
    );

    // 3. Re-add legacy conversation columns
    // Note: Step 2 (data migration to conversation_membership) is not reversible -
    // we cannot recreate the original userID/virtualContributorID assignments
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD "wellKnownVirtualContributor" character varying(128)`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD "virtualContributorID" uuid`
    );
    await queryRunner.query(`ALTER TABLE "conversation" ADD "userID" uuid`);
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD "type" character varying(128) NOT NULL DEFAULT 'user-user'`
    );

    // 1. Drop conversation_membership pivot table
    await queryRunner.query(
      `ALTER TABLE "conversation_membership" DROP CONSTRAINT "FK_d348791d10e1f31c61d7f5bd2a7"`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_membership" DROP CONSTRAINT "FK_285a9958dbcd10748d4470054d5"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_285a9958dbcd10748d4470054d"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d348791d10e1f31c61d7f5bd2a"`
    );
    await queryRunner.query(`DROP TABLE "conversation_membership"`);
  }
}
