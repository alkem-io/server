import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateActorTypeEnum1771000000000 implements MigrationInterface {
  name = 'CreateActorTypeEnum1771000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the actor_type_enum PostgreSQL ENUM type
    // This enum will be used by the Actor entity to discriminate between entity types
    // NOTE: Created with 'virtual-contributor' (not 'virtual') as the canonical value.
    await queryRunner.query(`
      CREATE TYPE "actor_type_enum" AS ENUM(
        'user',
        'organization',
        'virtual-contributor',
        'space',
        'account'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the actor_type_enum type
    // Note: This will fail if any column is still using the type
    await queryRunner.query(`DROP TYPE "actor_type_enum"`);
  }
}
