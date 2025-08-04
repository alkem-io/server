import { MigrationInterface, QueryRunner } from 'typeorm';

export class InvitationRoles1753198478441 implements MigrationInterface {
  name = 'InvitationRoles1753198478441';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD \`extraRoles\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` ADD \`roleSetExtraRoles\` text NOT NULL`
    );

    // Iterate over all invitations and migrate the extra role specified to the array
    const invitations: {
      id: string;
      extraRole: string | null;
    }[] = await queryRunner.query(`SELECT id, extraRole FROM \`invitation\``);
    for (const invitation of invitations) {
      let extraRoles: string[] = [];
      if (invitation.extraRole) {
        extraRoles = [invitation.extraRole];
      }
      await queryRunner.query(
        `UPDATE \`invitation\` SET \`extraRoles\` = '${extraRoles}' WHERE \`id\` = ?`,
        [invitation.id]
      );
    }

    // Iterate over all platform invitations + migrate the data
    const platformInvitations: {
      id: string;
      roleSetExtraRole: string | null;
    }[] = await queryRunner.query(
      `SELECT id, roleSetExtraRole FROM \`platform_invitation\``
    );
    for (const platformInvitation of platformInvitations) {
      let extraRoles: string[] = [];
      if (platformInvitation.roleSetExtraRole) {
        extraRoles = [platformInvitation.roleSetExtraRole];
      }
      await queryRunner.query(
        `UPDATE \`platform_invitation\` SET \`roleSetExtraRoles\` = '${extraRoles}' WHERE \`id\` = ?`,
        [platformInvitation.id]
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` DROP COLUMN \`roleSetExtraRole\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP COLUMN \`extraRole\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` ADD \`roleSetExtraRole\` varchar(128) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD \`extraRole\` varchar(128) NULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP COLUMN \`extraRoles\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` DROP COLUMN \`roleSetExtraRoles\``
    );
  }
}
