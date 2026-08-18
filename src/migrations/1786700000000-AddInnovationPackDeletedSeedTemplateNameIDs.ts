import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a single nullable jsonb column, `deletedSeedTemplateNameIDs`, to
 * `innovation_pack` — a bootstrap-internal tombstone recording the nameIDs
 * of seeded templates a platform admin has deleted from a pack, so the
 * classification-template seed's create-if-absent step can tell "never
 * created" apart from "admin-deleted" and never resurrect the latter.
 *
 * Not GraphQL-exposed (no `@Field` on `IInnovationPack`). No backfill: null
 * is read as "nothing deleted yet" everywhere it is consulted.
 */
export class AddInnovationPackDeletedSeedTemplateNameIDs1786700000000
  implements MigrationInterface
{
  name = 'AddInnovationPackDeletedSeedTemplateNameIDs1786700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "innovation_pack"
        ADD "deletedSeedTemplateNameIDs" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "innovation_pack" DROP COLUMN "deletedSeedTemplateNameIDs"
    `);
  }
}
