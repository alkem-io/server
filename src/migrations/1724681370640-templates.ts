import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { escapeString } from './utils/escape-string';

export class Templates1724681370640 implements MigrationInterface {
  name = 'Templates1724681370640';
  // TODO: PENDING ::
  // Create a profile for new entities like IFs and Whiteboards

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`template\` (
                                  \`id\` char(36) NOT NULL,
                                  \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                  \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                  \`version\` int NOT NULL,
                                  \`authorizationId\` char(36) NULL,
                                  \`profileId\` char(36) NULL,
                                  \`templatesSetId\` char(36) NULL,
                                  \`type\` varchar(128) NOT NULL,
                                  \`calloutId\` char(36) NULL,
                                  \`communityGuidelinesId\` char(36) NULL,
                                  \`innovationFlowId\` char(36) NULL,
                                  \`postType\` text NULL,
                                  \`postDefaultDescription\` text NULL,
                                  \`whiteboardId\` char(36) NULL,
                                  UNIQUE INDEX \`REL_4318f97beabd362a8a09e9d320\` (\`authorizationId\`),
                                  UNIQUE INDEX \`REL_f58c3b144b6e010969e199beef\` (\`profileId\`),
                                  UNIQUE INDEX \`REL_eedeae5e63f9a9c3a0161541e9\` (\`communityGuidelinesId\`),
                                  UNIQUE INDEX \`REL_c6e4d1a07781a809ad3b3ee826\` (\`calloutId\`),
                                  UNIQUE INDEX \`REL_a68a76b795cd5a976c9a7c5b08\` (\`innovationFlowId\`),
                                  UNIQUE INDEX \`REL_f09090a77e07377eefb3f731d9\` (\`whiteboardId\`),
                                  PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await queryRunner.query(
      `INSERT INTO \`template\` (id, createdDate, updatedDate, version, type, authorizationId, profileId, templatesSetId, communityGuidelinesId)
        SELECT id, createdDate, updatedDate, version, 'community-guidelines' as \`type\`, authorizationId, profileId, templatesSetId, guidelinesId as communityGuidelinesId
          FROM \`community_guidelines_template\`;`
    );

    await queryRunner.query(
      `INSERT INTO \`template\` (id, createdDate, updatedDate, version, type, authorizationId, profileId, templatesSetId, postType, postDefaultDescription)
        SELECT id, createdDate, updatedDate, version, 'post' as \`type\`, authorizationId, profileId, templatesSetId, \`type\` as postType, defaultDescription as postDefaultDescription
          FROM \`post_template\`;`
    );

    const innovationFlowTemplates: {
      id: string;
      createdDate: Date;
      updatedDate: Date;
      version: number;
      authorizationId: string;
      profileId: string;
      templatesSetId: string;
    }[] = await queryRunner.query(
      `SELECT id, createdDate, updatedDate, version, authorizationId, profileId, templatesSetId FROM \`innovation_flow_template\``
    );
    for (const innovationFlowTemplate of innovationFlowTemplates) {
      // Create a new InnovationFlow entity for each InnovationFlow
      const innovationFlowID =
        await this.createInnovationFlowFromInnovationFlowTemplate(
          queryRunner,
          innovationFlowTemplate.id
        );
      await queryRunner.query(
        `INSERT INTO \`template\` (id, createdDate, updatedDate, version, authorizationId, profileId, templatesSetId, type, innovationFlowId)
              VALUES (
              '${innovationFlowTemplate.id}',
              '${formatDate(innovationFlowTemplate.createdDate)}',
              '${formatDate(innovationFlowTemplate.updatedDate)}',
              ${innovationFlowTemplate.version},
              '${innovationFlowTemplate.authorizationId}',
              '${innovationFlowTemplate.profileId}',
              '${innovationFlowTemplate.templatesSetId}',
              'innovation-flow',
              '${innovationFlowID}')`
      );
    }

    await this.cleanUpWhiteboardTemplates(queryRunner);

    const whiteboardTemplates: {
      id: string;
      createdDate: Date;
      updatedDate: Date;
      version: number;
      authorizationId: string;
      profileId: string;
      templatesSetId: string;
    }[] = await queryRunner.query(
      `SELECT id, createdDate, updatedDate, version, authorizationId, profileId, templatesSetId FROM \`whiteboard_template\``
    );
    for (const whiteboardTemplate of whiteboardTemplates) {
      // Create a new Whiteboard entity for each WhiteboardTemplate
      const whiteboardID = await this.createWhiteboardFromWhiteboardTemplate(
        queryRunner,
        whiteboardTemplate.id
      );
      await queryRunner.query(
        `INSERT INTO \`template\` (id, createdDate, updatedDate, version, authorizationId, profileId, templatesSetId, type, whiteboardId)
              VALUES (
              '${whiteboardTemplate.id}',
              '${formatDate(whiteboardTemplate.createdDate)}',
              '${formatDate(whiteboardTemplate.updatedDate)}',
              ${whiteboardTemplate.version},
              '${whiteboardTemplate.authorizationId}',
              '${whiteboardTemplate.profileId}',
              '${whiteboardTemplate.templatesSetId}',
              'whiteboard',
              '${whiteboardID}')`
      );
    }

    const calloutTemplates: {
      id: string;
      createdDate: Date;
      updatedDate: Date;
      version: number;
      authorizationId: string;
      profileId: string;
      templatesSetId: string;
    }[] = await queryRunner.query(
      `SELECT id, createdDate, updatedDate, version, authorizationId, profileId, templatesSetId, framingId, contributionDefaultsId, contributionPolicyId, type FROM \`callout_template\``
    );
    for (const calloutTemplate of calloutTemplates) {
      const calloutID = await this.createCalloutFromCalloutTemplate(
        queryRunner,
        calloutTemplate.id
      );
      await queryRunner.query(
        `INSERT INTO \`template\` (id, createdDate, updatedDate, version, authorizationId, profileId, templatesSetId, type, calloutId)
              VALUES (
              '${calloutTemplate.id}',
              '${formatDate(calloutTemplate.createdDate)}',
              '${formatDate(calloutTemplate.updatedDate)}',
              ${calloutTemplate.version},
              '${calloutTemplate.authorizationId}',
              '${calloutTemplate.profileId}',
              '${calloutTemplate.templatesSetId}',
              'callout',
              '${calloutID}')`
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
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_a68a76b795cd5a976c9a7c5b08a\` FOREIGN KEY (\`innovationFlowId\`) REFERENCES \`innovation_flow\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
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

  private async createInnovationFlowFromInnovationFlowTemplate(
    queryRunner: QueryRunner,
    innovationFlowTemplateId: string
  ): Promise<string> {
    const innovationFlowID = randomUUID();
    const innovationFlowAuthID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules, type) VALUES
            ('${innovationFlowAuthID}',
            1, '', '', 0, '', 'innovation-flow')`
    );
    await queryRunner.query(
      `INSERT INTO innovation_flow (id, createdDate, updatedDate, version, authorizationId, states)
        SELECT '${innovationFlowID}' as \`id\`, createdDate, updatedDate, version, '${innovationFlowAuthID}' as authorizationId, states
        FROM innovation_flow_template WHERE id = '${innovationFlowTemplateId}'`
    );
    return innovationFlowID;
  }

  private async createWhiteboardFromWhiteboardTemplate(
    queryRunner: QueryRunner,
    whiteboardTemplateId: string
  ): Promise<string> {
    const whiteboardID = randomUUID();
    const whiteboardAuthID = randomUUID();
    const nameID = `template-${whiteboardID.slice(0, 8)}`;

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules, type) VALUES
            ('${whiteboardAuthID}',
            1, '', '', 0, '', 'whiteboard')`
    );
    await queryRunner.query(
      `INSERT INTO whiteboard (id, createdDate, updatedDate, version, authorizationId, content, nameID)
        SELECT '${whiteboardID}' as \`id\`, createdDate, updatedDate, version, '${whiteboardAuthID}' as authorizationId, content, '${nameID}' as nameID
        FROM whiteboard_template WHERE id = '${whiteboardTemplateId}'`
    );
    return whiteboardID;
  }

  private async cleanUpWhiteboardTemplates(
    queryRunner: QueryRunner
  ): Promise<void> {
    // In acceptance I've seen an orphan template without templateSetId:

    console.warn(
      'THE FOLLOWING whiteboard_templates ARE GOING TO BE DELETED!!!',
      await queryRunner.query(
        `SELECT id FROM whiteboard_template WHERE templatesSetId IS NULL`
      )
    );

    await queryRunner.query(
      `DELETE FROM profile WHERE id IN (SELECT profileId FROM whiteboard_template WHERE templatesSetId IS NULL)`
    );
    await queryRunner.query(
      `DELETE FROM authorization_policy WHERE id IN (SELECT authorizationId FROM whiteboard_template WHERE templatesSetId IS NULL)`
    );
    await queryRunner.query(
      `DELETE FROM whiteboard_template WHERE templatesSetId IS NULL`
    );
  }

  private async createCalloutFromCalloutTemplate(
    queryRunner: QueryRunner,
    calloutTemplateId: string
  ): Promise<string> {
    const calloutID = randomUUID();
    const calloutAuthID = randomUUID();
    const nameID = `template-${calloutID.slice(0, 8)}`;

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules, type) VALUES
            ('${calloutAuthID}',
            1, '', '', 0, '', 'callout')`
    );
    await queryRunner.query(
      `INSERT INTO callout (id, createdDate, updatedDate, version, authorizationId, framingId, contributionDefaultsId, contributionPolicyId, type, visibility, sortOrder, nameID)
        SELECT '${calloutID}' as \`id\`, createdDate, updatedDate, version, '${calloutAuthID}' as authorizationId,
          framingId,
          contributionDefaultsId,
          contributionPolicyId,
          \`type\`,
          'template',
          0,
          '${nameID}' as nameID
        FROM callout_template WHERE id = '${calloutTemplateId}'`
    );

    return calloutID;
  }
}

const formatDate = (date: Date) =>
  date.toISOString().replace('T', ' ').substring(0, 19);
