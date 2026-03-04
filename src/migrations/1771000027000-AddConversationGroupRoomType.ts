import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationGroupRoomType1771000027000
  implements MigrationInterface
{
  name = 'AddConversationGroupRoomType1771000027000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'conversation_group' to the room_type_enum
    // Using IF NOT EXISTS pattern for idempotency
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'conversation_group'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'room_type_enum')
        ) THEN
          ALTER TYPE room_type_enum ADD VALUE 'conversation_group';
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values directly.
    // The 'conversation_group' value will remain but is harmless if unused.
    // To fully revert, a new enum type would need to be created without this value
    // and all columns migrated — not worth the complexity for a rollback scenario.
  }
}
