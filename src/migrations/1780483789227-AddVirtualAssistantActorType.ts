import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `virtual-assistant` value to the `actor_type_enum` CTI discriminator
 * (004-web-ai-assistant). Postgres forbids using a freshly-added enum value
 * within the same transaction it was added. TypeORM's default
 * `migrationsTransactionMode` is `'all'` (every pending migration shares ONE
 * transaction, and `pnpm run migration:run` — used by the prod migration cron —
 * does not override it), so isolating the `ADD VALUE` in its own migration file
 * is NOT sufficient: the value would still be uncommitted when the next
 * migration seeds a row of that type. We therefore COMMIT the surrounding
 * transaction, add the value (autocommit), then open a fresh transaction for the
 * framework to continue — the established pattern in
 * `1771000022000-MoveNameIdToActorAddSpaceAccountProfiles`.
 *
 * Reverse is a no-op: Postgres has no `ALTER TYPE ... DROP VALUE`; enum
 * extensions are treated as forward-only.
 */
export class AddVirtualAssistantActorType1780483789227
  implements MigrationInterface
{
  name = 'AddVirtualAssistantActorType1780483789227';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Commit the framework's surrounding transaction so the new enum value is
    // usable by the following migration (which seeds a `virtual-assistant`
    // actor). Under the default `migrationsTransactionMode: 'all'` the ADD VALUE
    // would otherwise stay uncommitted within the shared transaction. Re-open a
    // transaction afterwards for the framework to continue + commit normally.
    await queryRunner.commitTransaction();
    await queryRunner.query(
      `ALTER TYPE "actor_type_enum" ADD VALUE IF NOT EXISTS 'virtual-assistant'`
    );
    await queryRunner.startTransaction();
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Postgres has no `ALTER TYPE ... DROP VALUE`; forward-only enum extension.
  }
}
