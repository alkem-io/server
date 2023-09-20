import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

const COMMUNITY_INVITEE = 'community-invitee';

export class addInviteeCredentials1695214596159 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const invitations: {
      id: string;
      invitedUser: string;
      communityId: string;
    }[] = await queryRunner.query(
      `SELECT id, invitedUser, communityId FROM invitation`
    );

    for (const invitation of invitations) {
      const users: { id: string; authorizationId: string; agentId: string }[] =
        await queryRunner.query(
          `SELECT id, authorizationId, agentId FROM user WHERE id = '${invitation.invitedUser}'`
        );

      const user = users[0];
      const uuid = randomUUID();
      await queryRunner.query(
        `INSERT INTO credential VALUES ('${uuid}', NOW(), NOW(), 2, '${invitation.communityId}', '${COMMUNITY_INVITEE}', '${user.agentId}')`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
