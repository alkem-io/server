import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `virtual_assistant` CTI child table and SEEDS the singleton
 * `virtual-assistant` platform actor (004-web-ai-assistant, FR-016).
 *
 * The actor is the identity the web AI assistant is attributed to. It is a pure
 * internal Actor (no Kratos identity), carrying its own profile / authorization
 * / credentials on the base `actor` table, plus an admin-managed per-capability
 * grant (`capabilityGrant`) governing system-invoked authority (FR-019),
 * defaulting to READ-ONLY.
 *
 * The `virtual-assistant` enum value is added by the preceding migration
 * `AddVirtualAssistantActorType1780483789227` (separate transaction — Postgres
 * cannot use a freshly-added enum value in the same transaction).
 */
export class VirtualAssistant1780483789228 implements MigrationInterface {
  name = 'VirtualAssistant1780483789228';

  // Fixed UUIDs make the seed idempotent and referenceable.
  private readonly actorId = '068b7478-0abd-4f19-906b-e1534f3b71b7';
  private readonly profileId = '4b008288-df65-4dc6-bc8f-cc3c1c89f83f';
  private readonly authorizationId = '43fc7ea0-d503-4b9a-ab06-f743aaae612b';
  private readonly profileAuthorizationId =
    'b1c2d3e4-f5a6-4789-9012-3456789abcde';
  private readonly credentialId = 'e2df329d-4c02-4969-a0b8-7db20a6d877c';
  private readonly nameID = 'virtual-assistant';

  // Read-only default grant (contracts/assistant-authority.md §3): all current
  // READ tools enabled; the two write tools disabled. Absence ⇒ disabled, so a
  // future tool defaults disabled until an admin enables it.
  private readonly readOnlyGrant = [
    { capability: 'search_content', enabled: true },
    { capability: 'list_whiteboards', enabled: true },
    { capability: 'analyze_whiteboard', enabled: true },
    { capability: 'analyze_contributions', enabled: true },
    { capability: 'analyze_audit_log', enabled: true },
    { capability: 'community_activity_summary', enabled: true },
    { capability: 'navigate_templates', enabled: true },
    { capability: 'create_whiteboard', enabled: false },
    { capability: 'update_whiteboard_content', enabled: false },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create the CTI child table.
    await queryRunner.query(
      `CREATE TABLE "virtual_assistant" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1,
        "capabilityGrant" jsonb NOT NULL DEFAULT '[]',
        CONSTRAINT "PK_virtual_assistant_id" PRIMARY KEY ("id")
      )`
    );

    // FK: virtual_assistant.id → actor.id (CTI parent), cascade delete.
    await queryRunner.query(
      `ALTER TABLE "virtual_assistant"
       ADD CONSTRAINT "FK_virtual_assistant_actor_id"
       FOREIGN KEY ("id") REFERENCES "actor"("id") ON DELETE CASCADE`
    );

    // Partial unique index on nameID for virtual-assistant actors.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_actor_nameID_virtual_assistant"
       ON "actor" ("nameID") WHERE "type" = 'virtual-assistant'`
    );

    // 2. Seed: authorization policy for the actor.
    await queryRunner.query(
      `INSERT INTO "authorization_policy"
         ("id", "version", "credentialRules", "privilegeRules", "type")
       VALUES ($1, 1, '[]'::json, '[]'::json, 'virtual-assistant')
       ON CONFLICT ("id") DO NOTHING`,
      [this.authorizationId]
    );

    // Authorization policy for the profile.
    await queryRunner.query(
      `INSERT INTO "authorization_policy"
         ("id", "version", "credentialRules", "privilegeRules", "type")
       VALUES ($1, 1, '[]'::json, '[]'::json, 'profile')
       ON CONFLICT ("id") DO NOTHING`,
      [this.profileAuthorizationId]
    );

    // Profile (display attribution for the assistant actor).
    await queryRunner.query(
      `INSERT INTO "profile"
         ("id", "version", "displayName", "tagline", "type", "authorizationId")
       VALUES ($1, 1, 'AI Assistant', 'Alkemio web AI assistant', 'virtual-contributor', $2)
       ON CONFLICT ("id") DO NOTHING`,
      [this.profileId, this.profileAuthorizationId]
    );

    // 3. Seed the base actor row.
    await queryRunner.query(
      `INSERT INTO "actor"
         ("id", "version", "type", "nameID", "profileId", "authorizationId")
       VALUES ($1, 1, 'virtual-assistant', $2, $3, $4)
       ON CONFLICT ("id") DO NOTHING`,
      [this.actorId, this.nameID, this.profileId, this.authorizationId]
    );

    // 4. Seed the CTI child row with the read-only capability grant.
    await queryRunner.query(
      `INSERT INTO "virtual_assistant" ("id", "version", "capabilityGrant")
       VALUES ($1, 1, $2::jsonb)
       ON CONFLICT ("id") DO NOTHING`,
      [this.actorId, JSON.stringify(this.readOnlyGrant)]
    );

    // 5. Seed a GLOBAL_REGISTERED credential so buildForActor resolves
    //    registered-user-equivalent READ access for the actor (Flow B reads).
    await queryRunner.query(
      `INSERT INTO "credential"
         ("id", "version", "resourceID", "type", "actorId")
       VALUES ($1, 1, '', 'global-registered', $2)
       ON CONFLICT ("id") DO NOTHING`,
      [this.credentialId, this.actorId]
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "credential" WHERE "id" = $1`,
      [this.credentialId]
    );
    // Removing the actor cascades to virtual_assistant via the FK.
    await queryRunner.query(`DELETE FROM "actor" WHERE "id" = $1`, [
      this.actorId,
    ]);
    await queryRunner.query(`DELETE FROM "profile" WHERE "id" = $1`, [
      this.profileId,
    ]);
    await queryRunner.query(
      `DELETE FROM "authorization_policy" WHERE "id" IN ($1, $2)`,
      [this.authorizationId, this.profileAuthorizationId]
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_actor_nameID_virtual_assistant"`
    );
    await queryRunner.query(
      `ALTER TABLE "virtual_assistant" DROP CONSTRAINT IF EXISTS "FK_virtual_assistant_actor_id"`
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "virtual_assistant"`);
  }
}
