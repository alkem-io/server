import { MigrationInterface, QueryRunner } from 'typeorm';

export class VcInteractionJsonColumn1765033200000
  implements MigrationInterface
{
  name = 'VcInteractionJsonColumn1765033200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add jsonb column to room table
    await queryRunner.query(
      `ALTER TABLE "room" ADD "vcInteractionsByThread" jsonb NOT NULL DEFAULT '{}'`
    );

    // Migrate data from vc_interaction table to room.vcInteractionsByThread
    // This converts VC entity IDs to agent IDs during migration
    await queryRunner.query(`
      UPDATE room r
      SET "vcInteractionsByThread" = (
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
      )
      WHERE EXISTS (
        SELECT 1 FROM vc_interaction vi WHERE vi."roomId" = r.id
      )
    `);

    // Drop old vc_interaction table
    await queryRunner.query(`DROP TABLE IF EXISTS "vc_interaction"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate vc_interaction table structure
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

    // Migrate data back from room.vcInteractionsByThread to vc_interaction table
    // Note: This reverse migration cannot perfectly restore original data
    // as we lose the original VC entity IDs (we only have agent IDs)
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
      JOIN agent a ON a.id = (thread_data.value->>'virtualContributorActorID')
      JOIN virtual_contributor vc ON vc."agentId" = a.id
      WHERE r."vcInteractionsByThread" IS NOT NULL
        AND r."vcInteractionsByThread" != '{}'::jsonb
    `);

    // Remove jsonb column from room
    await queryRunner.query(
      `ALTER TABLE "room" DROP COLUMN "vcInteractionsByThread"`
    );
  }
}
