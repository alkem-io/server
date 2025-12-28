import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateActorTypeEnum1766840676153 implements MigrationInterface {
  name = 'CreateActorTypeEnum1766840676153';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the actor_type_enum PostgreSQL ENUM type
    // This enum will be used by the Actor entity to discriminate between entity types
    await queryRunner.query(`
      CREATE TYPE "actor_type_enum" AS ENUM(
        'user',
        'organization',
        'virtual',
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
