import { MigrationInterface, QueryRunner } from 'typeorm';

export class invitationContributor1718174556242 implements MigrationInterface {
  name = 'invitationContributor1718174556242';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`invitation\` RENAME COLUMN \`invitedUser\` TO \`invitedContributor\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD \`contributorType\` char(36) NOT NULL`
    );
    const invitations: {
      id: string;
    }[] = await queryRunner.query(`SELECT id FROM invitation`);
    for (const invitation of invitations) {
      await queryRunner.query(
        `UPDATE invitation SET contributorType = 'user' WHERE id = '${invitation.id}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
