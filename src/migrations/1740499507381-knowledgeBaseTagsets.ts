import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class KnowledgeBaseTagsets1740499507381 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const kbProfiles: {
      id: string;
    }[] = await queryRunner.query(
      `SELECT id FROM \`profile\` WHERE type = 'knowledge-base'`
    );
    for (const profile of kbProfiles) {
      const tagsets: {
        id: string;
      }[] = await queryRunner.query(
        `SELECT id FROM \`tagset\` WHERE profileId = 'profile.id'`
      );
      if (tagsets.length === 0) {
        const tagsetId = randomUUID();
        const authorizationID = await this.createAuthorizationPolicy(
          queryRunner,
          'knowledge-base'
        );
        await queryRunner.query(`INSERT INTO tagset (
                                  id,
                                  version,
                                  profileId,
                                  authorizationId,
                                  name,
                                  type,
                                  tags) VALUES
                          (
                          '${tagsetId}',
                          1,
                          '${profile.id}',
                          '${authorizationID}',
                          'default',
                          'freeform',
                          ''
                          )`);
      }
    }

    const calloutsSetKB: {
      id: string;
      tagsetTemplateSetId: string;
    }[] = await queryRunner.query(
      `SELECT id, tagsetTemplateSetId FROM \`callouts_set\` WHERE type = 'knowledge-base'`
    );
    for (const calloutsSet of calloutsSetKB) {
      const tagsetTemplates: {
        id: string;
      }[] = await queryRunner.query(
        `SELECT id FROM \`tagset_template\` WHERE tagsetTemplateSetId = '${calloutsSet.tagsetTemplateSetId}'`
      );
      if (tagsetTemplates.length === 0) {
        await this.createTagsetTemplate(
          queryRunner,
          calloutsSet.tagsetTemplateSetId,
          'callout-group',
          'select-one',
          'HOME,COMMUNITY,SUBSPACES,KNOWLEDGE',
          'HOME'
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async createAuthorizationPolicy(
    queryRunner: QueryRunner,
    policyType: string
  ): Promise<string> {
    const authID = randomUUID();
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, privilegeRules, type) VALUES
                          ('${authID}',
                          1, '[]', '[]', '[]', '${policyType}')`
    );
    return authID;
  }

  private async createTagsetTemplate(
    queryRunner: QueryRunner,
    tagsetTemplateSetId: string,
    name: string,
    type: string,
    allowedValues: string,
    defaultSelectedValue: string
  ): Promise<string> {
    const tagsetTemplateId = randomUUID();
    await queryRunner.query(`INSERT INTO tagset_template (
                                  id,
                                  version,
                                  tagsetTemplateSetId,
                                  name,
                                  type,
                                  allowedValues,
                                  defaultSelectedValue) VALUES
                          (
                          '${tagsetTemplateId}',
                          1,
                          '${tagsetTemplateSetId}',
                          '${name}',
                          '${type}',
                          '${allowedValues}',
                          '${defaultSelectedValue}'
                          )`);
    return tagsetTemplateId;
  }
}
