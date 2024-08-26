import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { escapeString } from './utils/escape-string';

export class Templates1724681370640 implements MigrationInterface {
  name = 'Templates1724681370640';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`template\` (
                                  \`id\` char(36) NOT NULL,
                                  \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                  \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                  \`version\` int NOT NULL,
                                  \`type\` varchar(128) NOT NULL,
                                  \`postDefaultDescription\` text NULL,
                                  \`innovationFlowStates\` text NULL,
                                  \`authorizationId\` char(36) NULL,
                                  \`templatesSetId\` char(36) NULL,
                                  \`profileId\` char(36) NULL,
                                  \`communityGuidelinesId\` char(36) NULL,
                                  \`calloutId\` char(36) NULL,
                                  \`whiteboardId\` char(36) NULL,
                                  UNIQUE INDEX \`REL_4318f97beabd362a8a09e9d320\` (\`authorizationId\`),
                                  UNIQUE INDEX \`REL_f58c3b144b6e010969e199beef\` (\`profileId\`),
                                  UNIQUE INDEX \`REL_eedeae5e63f9a9c3a0161541e9\` (\`communityGuidelinesId\`),
                                  UNIQUE INDEX \`REL_c6e4d1a07781a809ad3b3ee826\` (\`calloutId\`),
                                  UNIQUE INDEX \`REL_f09090a77e07377eefb3f731d9\` (\`whiteboardId\`),
                                  PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    const postTemplates: {
      id: string;
      authorizationId: string;
      profileId: string;
      templatesSetId: string;
      defaultDescription: string;
    }[] = await queryRunner.query(
      `SELECT id, authorizationId, profileId, templatesSetId, defaultDescription FROM \`post_template\``
    );
    for (const postTemplate of postTemplates) {
      await queryRunner.query(
        `INSERT INTO \`template\` (id, version, authorizationId, profileId, templatesSetId, type, postDefaultDescription )
              VALUES ('${postTemplate.id}', 1, '${postTemplate.authorizationId}', '${postTemplate.profileId}', '${postTemplate.templatesSetId}',
              'post', '${escapeString(postTemplate.defaultDescription)}')`
      );
    }

    const whiteboardTemplates: {
      id: string;
      authorizationId: string;
      profileId: string;
      templatesSetId: string;
      content: string;
    }[] = await queryRunner.query(
      `SELECT id, authorizationId, profileId, templatesSetId, content FROM \`whiteboard_template\``
    );
    for (const whiteboardTemplate of whiteboardTemplates) {
      // Create a new Whiteboard entity for each WhiteboardTemplate
      const whiteboardID = await this.createWhiteboardFromWhiteboardTemplate(
        queryRunner,
        whiteboardTemplate.content
      );
      await queryRunner.query(
        `INSERT INTO \`template\` (id, version, authorizationId, profileId, templatesSetId, type, whiteboardId)
              VALUES ('${whiteboardTemplate.id}', 1, '${whiteboardTemplate.authorizationId}', '${whiteboardTemplate.profileId}', '${whiteboardTemplate.templatesSetId}',
              'whiteboard', '${whiteboardID}')`
      );
    }

    const communityGuidelinesTemplates: {
      id: string;
      authorizationId: string;
      profileId: string;
      templatesSetId: string;
      guidelinesId: string;
    }[] = await queryRunner.query(
      `SELECT id, authorizationId, profileId, templatesSetId, guidelinesId FROM \`community_guidelines_template\``
    );
    for (const communityGuidelinesTemplate of communityGuidelinesTemplates) {
      await queryRunner.query(
        `INSERT INTO \`template\` (id, version, authorizationId, profileId, templatesSetId, type, communityGuidelinesId)
              VALUES ('${communityGuidelinesTemplate.id}', 1, '${communityGuidelinesTemplate.authorizationId}', '${communityGuidelinesTemplate.profileId}', '${communityGuidelinesTemplate.templatesSetId}',
              'community-guidelines', '${communityGuidelinesTemplate.guidelinesId}')`
      );
    }

    const innovationFlowTemplates: {
      id: string;
      authorizationId: string;
      profileId: string;
      templatesSetId: string;
      states: string;
    }[] = await queryRunner.query(
      `SELECT id, authorizationId, profileId, templatesSetId, states FROM \`innovation_flow_template\``
    );
    for (const innovationFlowTemplate of innovationFlowTemplates) {
      await queryRunner.query(
        `INSERT INTO \`template\` (id, version, authorizationId, profileId, templatesSetId, type, innovationFlowStates)
              VALUES ('${innovationFlowTemplate.id}', 1, '${innovationFlowTemplate.authorizationId}', '${innovationFlowTemplate.profileId}', '${innovationFlowTemplate.templatesSetId}',
              'innovation-flow', '${innovationFlowTemplate.states}')`
      );
    }

    const calloutTemplates: {
      id: string;
      authorizationId: string;
      profileId: string;
      templatesSetId: string;
      framingId: string;
      contributionDefaultsId: string;
      contributionPolicyId: string;
      type: string;
    }[] = await queryRunner.query(
      `SELECT id, authorizationId, profileId, templatesSetId, framingId, contributionDefaultsId, contributionPolicyId, type FROM \`callout_template\``
    );
    for (const calloutTemplate of calloutTemplates) {
      const calloutID = await this.createCalloutFromElements(
        queryRunner,
        calloutTemplate.framingId,
        calloutTemplate.contributionDefaultsId,
        calloutTemplate.contributionPolicyId,
        calloutTemplate.type
      );
      await queryRunner.query(
        `INSERT INTO \`template\` (id, version, authorizationId, profileId, templatesSetId, type, calloutId)
              VALUES ('${calloutTemplate.id}', 1, '${calloutTemplate.authorizationId}', '${calloutTemplate.profileId}', '${calloutTemplate.templatesSetId}',
              'callout', '${calloutID}')`
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_4318f97beabd362a8a09e9d3203\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_c7f54e6269c013d9c273f025edd\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_f58c3b144b6e010969e199beeff\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_eedeae5e63f9a9c3a0161541e98\` FOREIGN KEY (\`communityGuidelinesId\`) REFERENCES \`community_guidelines\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_c6e4d1a07781a809ad3b3ee8265\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_f09090a77e07377eefb3f731d9f\` FOREIGN KEY (\`whiteboardId\`) REFERENCES \`whiteboard\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`space_defaults\` ADD CONSTRAINT \`FK_592a23e68922853bae6ebecd85e\` FOREIGN KEY (\`innovationFlowTemplateId\`) REFERENCES \`template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Drop the old template tables
    await queryRunner.query(`DROP TABLE \`post_template\``);
    await queryRunner.query(`DROP TABLE \`whiteboard_template\``);
    await queryRunner.query(`DROP TABLE \`community_guidelines_template\``);
    await queryRunner.query(`DROP TABLE \`innovation_flow_template\``);
    await queryRunner.query(`DROP TABLE \`callout_template\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async createWhiteboardFromWhiteboardTemplate(
    queryRunner: QueryRunner,
    content: string
  ): Promise<string> {
    const whiteboardID = randomUUID();
    const whiteboardAuthID = randomUUID();
    const nameID = whiteboardID.slice(0, 8);

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules, type) VALUES
            ('${whiteboardAuthID}',
            1, '', '', 0, '', 'whiteboard')`
    );
    await queryRunner.query(
      `INSERT INTO whiteboard (id, version, authorizationId, content, nameID) VALUES
                  VALUES ('${whiteboardID}',
                          '1',
                          '${whiteboardAuthID}',
                          '${escapeString(content)}',
                          '${nameID}')`
    );
    return whiteboardID;
  }

  private async createCalloutFromElements(
    queryRunner: QueryRunner,
    framingId: string,
    contributionDefaultsId: string,
    contributionPolicyId: string,
    type: string
  ): Promise<string> {
    const calloutID = randomUUID();
    const calloutAuthID = randomUUID();
    const nameID = calloutID.slice(0, 8);

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules, type) VALUES
            ('${calloutAuthID}',
            1, '', '', 0, '', 'callout')`
    );

    await queryRunner.query(
      `INSERT INTO callout (id, version, authorizationId, framingId, contributionDefaultsId, contributionPolicyId, type, visibility, sortOrder, nameID) VALUES
                  VALUES ('${calloutID}',
                          '1',
                          '${calloutAuthID}',
                          '${framingId}',
                          '${contributionDefaultsId}',
                          '${contributionPolicyId}',
                          '${type}',
                          'published',
                          '1',
                          '${nameID}')`
    );
    return calloutID;
  }
}
