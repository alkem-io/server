import { MigrationInterface, QueryRunner } from 'typeorm';

export class organizationTagsetRename1634294782266
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE tagset AS ts
            INNER JOIN profile AS prof ON ts.profileId = prof.id
            INNER JOIN organization AS org ON org.profileId = prof.id
            SET ts.name = 'capabilities'
            WHERE ts.name = 'skills'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE tagset AS ts
            INNER JOIN profile AS prof ON ts.profileId = prof.id
            INNER JOIN organization AS org ON org.profileId = prof.id
            SET ts.name = 'skills'
            WHERE ts.name = 'capabilities'`
    );
  }
}
