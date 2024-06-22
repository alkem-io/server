import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCommunityGuidelinesProfileRelationOptions1711636518883
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines\` DROP FOREIGN KEY \`FK_3d60fe4fa40d54bad7d51bb4bd1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines\` ADD CONSTRAINT \`FK_3d60fe4fa40d54bad7d51bb4bd1\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines\` DROP FOREIGN KEY \`FK_3d60fe4fa40d54bad7d51bb4bd1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines\` ADD CONSTRAINT \`FK_3d60fe4fa40d54bad7d51bb4bd1\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }
}
