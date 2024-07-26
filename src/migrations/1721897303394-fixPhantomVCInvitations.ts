import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPhantomVCInvitations1721897303394
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DELETE FROM invitation
        WHERE invitedContributor NOT IN (
            SELECT id FROM virtual_contributor
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log(
      'Reversing the deletion of invitations is not feasible. Restore from a backup.'
    );
  }
}
