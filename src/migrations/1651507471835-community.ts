import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { CommunityPolicy } from '@domain/community/community/community.policy';

export class community1651507471835 implements MigrationInterface {
  name = 'community1651507471835';

  private challengeCommunityPolicy: CommunityPolicy = {
    member: {
      credentialType: AuthorizationCredential.CHALLENGE_MEMBER,
      credentialResourceID: '',
      minOrg: 0,
      maxOrg: -1,
      minUser: 0,
      maxUser: -1,
    },
    leader: {
      credentialType: AuthorizationCredential.CHALLENGE_LEAD,
      credentialResourceID: '',
      minOrg: 0,
      maxOrg: 9,
      minUser: 0,
      maxUser: 2,
    },
  };

  private opportunityCommunityPolicy: CommunityPolicy = {
    member: {
      credentialType: AuthorizationCredential.OPPORTUNITY_MEMBER,
      credentialResourceID: '',
      minOrg: 0,
      maxOrg: -1,
      minUser: 0,
      maxUser: -1,
    },
    leader: {
      credentialType: AuthorizationCredential.OPPORTUNITY_LEAD,
      credentialResourceID: '',
      minOrg: 0,
      maxOrg: 9,
      minUser: 0,
      maxUser: 2,
    },
  };

  private hubCommunityPolicy: CommunityPolicy = {
    member: {
      credentialType: AuthorizationCredential.HUB_MEMBER,
      credentialResourceID: '',
      minOrg: 0,
      maxOrg: -1,
      minUser: 0,
      maxUser: -1,
    },
    leader: {
      credentialType: AuthorizationCredential.HUB_HOST,
      credentialResourceID: '',
      minOrg: 0,
      maxOrg: 9,
      minUser: 0,
      maxUser: 2,
    },
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`policy\` text NULL`
    );

    const communities: any[] = await queryRunner.query(
      `SELECT id, credentialId from community`
    );
    for (const community of communities) {
      console.log(`Retrieved community with id: ${community.id}`);

      // Create the leadership Credential
      const leadCredentialId = randomUUID();
      const credentials: any[] = await queryRunner.query(
        `SELECT id, type, resourceID from credential WHERE (id = '${community.membershipCredentialId}')`
      );
      if (credentials.length === 1) {
        const credential = credentials[0];
        let policy: CommunityPolicy;
        if (credential.type === 'hub-member') {
          policy = this.hubCommunityPolicy;
        } else if (credential.type === 'challenge-member') {
          policy = this.challengeCommunityPolicy;
        } else if (credential.type === 'opportunity-member') {
          policy = this.opportunityCommunityPolicy;
        } else {
          throw new Error(`Credential type not defined`);
        }
        policy.member.credentialResourceID = credential.resourceID;
        policy.leader.credentialResourceID = credential.resourceID;
        await queryRunner.query(
          `update community set policy = '${JSON.stringify(
            policy
          )}' WHERE (id = '${community.id}')`
        );
        // delete the credential
        await queryRunner.query(
          `DELETE FROM credential WHERE (id = '${credential.id}')`
        );
      }
    }
    await queryRunner.query(
      'ALTER TABLE `community` DROP FOREIGN KEY `FK_973fe78e64b8a79056d58ead433`'
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` DROP COLUMN \`credentialId\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // todo: down??
  }
}
