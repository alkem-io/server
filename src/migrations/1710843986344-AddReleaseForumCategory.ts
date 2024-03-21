import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReleaseForumCategory1710843986344
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const [platform]: { communicationId: string }[] = await queryRunner.query(`
      SELECT communicationId FROM platform
    `);

    await queryRunner.query(`
      UPDATE communication SET discussionCategories = 'releases,platform-functionalities,community-building,challenge-centric,help,other'
      WHERE id = '${platform.communicationId}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [platform]: { communicationId: string }[] = await queryRunner.query(`
      SELECT communicationId FROM platform
    `);

    await queryRunner.query(`
      UPDATE communication SET discussionCategories = 'platform-functionalities,community-building,challenge-centric,help,other'
      WHERE id = '${platform.communicationId}'
    `);
  }
}
