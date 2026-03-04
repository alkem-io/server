import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationGroupRoomType1771000027000
  implements MigrationInterface
{
  name = 'AddConversationGroupRoomType1771000027000';

  public async up(_queryRunner: QueryRunner): Promise<void> {
    // No-op: Room.type is stored as varchar, not a PostgreSQL enum.
    // The new 'conversation_group' value is accepted without schema changes.
    // This migration exists as a placeholder to document the introduction of
    // CONVERSATION_GROUP as a valid RoomType value.
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op: varchar column — nothing to revert.
  }
}
