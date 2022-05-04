import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class community1651507471835 implements MigrationInterface {
  name = 'community1651507471835';

  hubCommunityPolicy = {
    minOrg: 1,
    maxOrg: 1,
    minUser: 0,
    maxUser: 2,
  };

  defaultCommunityPolicy = {
    minOrg: 0,
    maxOrg: 9,
    minUser: 0,
    maxUser: 2,
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`leadershipCredentialId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD UNIQUE INDEX \`IDX_99999ca8ac212b8357637794d6\` (\`leadershipCredentialId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_99999ca8ac212b8357637794d6f\` FOREIGN KEY (\`leadershipCredentialId\`) REFERENCES \`credential\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`policy\` text NULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`community\` RENAME COLUMN \`credentialId\` TO \`membershipCredentialId\``
    );

    const communities: any[] = await queryRunner.query(
      `SELECT id, membershipCredentialId from community`
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
        let leadCredentialType = '';
        if (credential.type === 'hub-member') {
          leadCredentialType = 'hub-host';
          await queryRunner.query(
            `update community set policy = '${JSON.stringify(
              this.hubCommunityPolicy
            )}' WHERE (id = '${community.id}')`
          );
        }
        if (credential.type === 'challenge-member') {
          leadCredentialType = 'challenge-lead';
          await queryRunner.query(
            `update community set policy = '${JSON.stringify(
              this.defaultCommunityPolicy
            )}' WHERE (id = '${community.id}')`
          );
        }
        if (credential.type === 'opportunity-member') {
          leadCredentialType = 'opportunity-lead';
          await queryRunner.query(
            `update community set policy = '${JSON.stringify(
              this.defaultCommunityPolicy
            )}' WHERE (id = '${community.id}')`
          );
        }
        if (leadCredentialType.length > 0) {
          await queryRunner.query(
            `INSERT INTO credential (id, version, type, resourceID)
            values ('${leadCredentialId}', 1,  '${leadCredentialType}', '${credential.resourceID}')`
          );
          await queryRunner.query(
            `update community set leadershipCredentialId = '${leadCredentialId}' WHERE (id = '${community.id}')`
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
