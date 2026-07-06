import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * workspace#017-innovation-hub-resources (FR-014 / FR-018)
 *
 * Adds the two curated resource lists to `innovation_hub`, mirroring the
 * existing `spaceListFilter` column (TypeORM `simple-array`: a single text
 * column holding comma-joined UUIDs, no brackets; empty list = empty string).
 *
 * Backfill rationale: Innovation Hubs that already exist must show the new
 * public-page sections immediately after rollout, seeded to the same default
 * a newly created hub gets — ALL of the owning account's Innovation Packs
 * (Innovation Library seed order: `rowId` ascending) and ALL of its Virtual
 * Contributors (account order: `rowId` ascending; VC ids are the CTI `actor`
 * base-table ids — `virtual_contributor.id` IS the actor id, the join below
 * only guards against orphaned child rows). Hubs whose `accountId` is NULL
 * (account deleted, FK is ON DELETE SET NULL) are seeded with an empty list.
 *
 * Idempotent: the backfill only writes where the column IS NULL, so re-running
 * is a no-op and never overwrites an admin-curated list. The existing Spaces
 * lists (`spaceListFilter`) are deliberately left untouched (FR-018).
 */
export class AddInnovationHubResourceLists1783100000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "innovation_hub" ADD "innovationPackListFilter" text`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_hub" ADD "virtualContributorListFilter" text`
    );

    // Backfill packs: all account packs, Innovation Library seed order (rowId ASC)
    await queryRunner.query(`
      UPDATE "innovation_hub" hub
      SET "innovationPackListFilter" = COALESCE(
        (
          SELECT string_agg(pack."id"::text, ',' ORDER BY pack."rowId" ASC)
          FROM "innovation_pack" pack
          WHERE pack."accountId" = hub."accountId"
        ),
        ''
      )
      WHERE hub."innovationPackListFilter" IS NULL
    `);

    // Backfill VCs: all account VCs (actor ids), account order (rowId ASC)
    await queryRunner.query(`
      UPDATE "innovation_hub" hub
      SET "virtualContributorListFilter" = COALESCE(
        (
          SELECT string_agg(actor."id"::text, ',' ORDER BY vc."rowId" ASC)
          FROM "virtual_contributor" vc
          JOIN "actor" actor ON actor."id" = vc."id"
          WHERE vc."accountId" = hub."accountId"
        ),
        ''
      )
      WHERE hub."virtualContributorListFilter" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "innovation_hub" DROP COLUMN "virtualContributorListFilter"`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_hub" DROP COLUMN "innovationPackListFilter"`
    );
  }
}
