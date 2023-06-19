import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  hubCommunityPolicy,
  challengeCommunityPolicy,
} from '@domain/challenge';
import { opportunityCommunityPolicy } from '@domain/collaboration/opportunity';
import { CredentialDefinition } from '@domain/agent/credential/credential.definition';
import { AuthorizationCredential } from './utils/duplicate/authorization.credential';

type CommunityPolicy = {
  member: CommunityPolicyRole;
  lead: CommunityPolicyRole;
};

type CommunityPolicyRole = {
  credential: CredentialDefinition;
  minUser: number;
  maxUser: number;
  minOrg: number;
  maxOrg: number;
};

export class community1651507471835 implements MigrationInterface {
  name = 'community1651507471835';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`policy\` text NULL`
    );

    const communities: any[] = await queryRunner.query(
      `SELECT id, credentialId FROM community`
    );
    for (const community of communities) {
      // Create the leadership Credential
      const credentials: any[] = await queryRunner.query(
        `SELECT id, type, resourceID FROM credential WHERE (id = '${community.credentialId}')`
      );
      if (credentials.length === 1) {
        const credential = credentials[0];
        let policy: CommunityPolicy;

        switch (credential.type) {
          case AuthorizationCredential.HUB_MEMBER:
            policy = hubCommunityPolicy;
            break;
          case AuthorizationCredential.CHALLENGE_MEMBER:
            policy = challengeCommunityPolicy;
            break;
          case AuthorizationCredential.OPPORTUNITY_MEMBER:
            policy = opportunityCommunityPolicy;
            break;
          default:
            throw new Error(`Credential type not defined`);
        }

        policy.member.credential.resourceID = credential.resourceID;
        policy.lead.credential.resourceID = credential.resourceID;
        await queryRunner.query(
          `UPDATE community SET policy = '${JSON.stringify(
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
      `ALTER TABLE \`community\` DROP COLUMN \`credentialId\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`credentialId\` varchar(36) NULL`
    );
    await queryRunner.query(
      'ALTER TABLE `community` ADD CONSTRAINT `FK_973fe78e64b8a79056d58ead433` FOREIGN KEY (`credentialId`) REFERENCES `credential`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );

    const communities: any[] = await queryRunner.query(
      `SELECT id, policy FROM community`
    );
    for (const community of communities) {
      const policy: CommunityPolicy = JSON.parse(community.policy);

      const credentialID = randomUUID();
      if (
        policy.member &&
        policy.member.credential &&
        policy.member.credential.type &&
        policy.member.credential.resourceID
      ) {
        await queryRunner.query(
          `INSERT INTO credential VALUES ('${credentialID}', NOW(), NOW(), 1, '${policy.member.credential.resourceID}', '${policy.member.credential.type}', NULL)`
        );

        await queryRunner.query(
          `UPDATE community SET credentialId = '${credentialID}' WHERE (id = '${community.id}')`
        );
      }
    }
    await queryRunner.query(`ALTER TABLE \`community\` DROP COLUMN \`policy\``);
  }
}
