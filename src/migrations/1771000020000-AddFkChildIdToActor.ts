import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Option C entity refactor: child entities (user, organization, virtual_contributor,
 * space, account) are now standalone @Entity classes linked to actor via a OneToOne
 * relation where child.id = actor.id (shared primary key pattern).
 *
 * This migration adds explicit FK constraints from each child table's id column
 * to the actor table's id column, formalizing the relationship that was previously
 * managed implicitly by TypeORM's Single Table Inheritance (STI).
 *
 * The FK uses CASCADE delete: deleting an actor also removes the child row,
 * maintaining referential integrity.
 */
export class AddFkChildIdToActor1771000020000 implements MigrationInterface {
  name = 'AddFkChildIdToActor1771000020000';

  private readonly childTables = [
    'user',
    'organization',
    'virtual_contributor',
    'space',
    'account',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.childTables) {
      // Check if FK already exists to make migration idempotent
      const existing = await queryRunner.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = '${table}'
          AND constraint_name = 'FK_${table}_actor_id'
          AND constraint_type = 'FOREIGN KEY'
      `);

      if (existing.length === 0) {
        // Remove orphaned child rows that reference non-existent actors
        await queryRunner.query(`
          DELETE FROM "${table}"
          WHERE id NOT IN (SELECT id FROM actor)
        `);

        await queryRunner.query(`
          ALTER TABLE "${table}"
          ADD CONSTRAINT "FK_${table}_actor_id"
          FOREIGN KEY ("id")
          REFERENCES "actor"("id")
          ON DELETE CASCADE
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.childTables) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
        DROP CONSTRAINT IF EXISTS "FK_${table}_actor_id"
      `);
    }
  }
}
