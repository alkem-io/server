import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';
import replaceSpecialCharacters from 'replace-special-characters';
import { escapeString } from './utils/escape-string';

export class calloutPolicyDefaults1696674755742 implements MigrationInterface {
  name = 'calloutPolicyDefaults1696674755742';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the FKs before starting changes
    // Callout ==> PostTemplate
    await queryRunner.query(
      `ALTER TABLE \`callout\`  DROP FOREIGN KEY \`FK_22a2ec1b5bca6c54678ffb19eb0\``
    );
    // Callout ==> WhiteboardTemplate
    await queryRunner.query(
      `ALTER TABLE \`callout\`  DROP FOREIGN KEY \`FK_c506eee0b7d06523b2953d07337\``
    );

    // Add in the structure
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`contributionPolicyId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`contributionDefaultsId\` char(36) NULL`
    );

    // Create entities + move data

    const callouts: {
      id: string;
      state: string;
      whiteboardTemplateId: string;
      postTemplateId: string;
      type: string;
    }[] = await queryRunner.query(
      `SELECT id, type, state, whiteboardTemplateId, postTemplateId, type from callout`
    );
    for (const callout of callouts) {
      // Create and link the Defaults
      const contributionDefaultsID = randomUUID();

      await queryRunner.query(
        `INSERT INTO callout_contribution_defaults (id, version)
                    VALUES ('${contributionDefaultsID}',
                            '1')`
      );

      const [whiteboardTemplate]: {
        id: string;
        content: string;
      }[] = await queryRunner.query(
        `SELECT id, content FROM whiteboard_template WHERE id = '${callout.whiteboardTemplateId}'`
      );
      if (whiteboardTemplate) {
        await queryRunner.query(
          `UPDATE callout_contribution_defaults SET content = '${escapeString(
            whiteboardTemplate.content
          )}' WHERE id = '${contributionDefaultsID}'`
        );
      }

      const [postTemplate]: {
        id: string;
        defaultDescription: string;
      }[] = await queryRunner.query(
        `SELECT id, defaultDescription FROM post_template WHERE id = '${callout.postTemplateId}'`
      );
      if (postTemplate) {
        await queryRunner.query(
          `UPDATE callout_contribution_defaults SET postDescription = '${escapeString(
            postTemplate.defaultDescription
          )}' WHERE id = '${contributionDefaultsID}'`
        );
      }

      // Create and link the policy
      const contributionPolicyID = randomUUID();
      let allowedContributionTypes: string[] = [];
      switch (callout.type) {
        case CalloutType.WHITEBOARD_COLLECTION:
          allowedContributionTypes.push(ContributionType.WHITEBOARD);
          break;
        case CalloutType.POST_COLLECTION:
          allowedContributionTypes.push(ContributionType.POST);
          break;
        case CalloutType.LINK_COLLECTION:
          allowedContributionTypes.push(ContributionType.LINK);
          break;
      }

      await queryRunner.query(
        `INSERT INTO callout_contribution_policy (id, version, state, allowedContributionTypes)
                    VALUES ('${contributionPolicyID}',
                            '1',
                            '${callout.state}',
                            '${JSON.stringify(allowedContributionTypes)}')`
      );
    }

    // Add in constraints
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD UNIQUE INDEX \`IDX_1e740008a7e1512966e3b08414\` (\`contributionPolicyId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD UNIQUE INDEX \`IDX_36b0da55acff774d0845aeb55f\` (\`contributionDefaultsId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_1e740008a7e1512966e3b084148\` FOREIGN KEY (\`contributionPolicyId\`) REFERENCES \`callout_contribution_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_36b0da55acff774d0845aeb55f2\` FOREIGN KEY (\`contributionDefaultsId\`) REFERENCES \`callout_contribution_defaults\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Remove old data
    await queryRunner.query(`ALTER TABLE \`callout\` DROP COLUMN \`state\``);
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`postTemplateId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`whiteboardTemplateId\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the constraints
    //Callout ==> contributionPolicy
    await queryRunner.query(
      `ALTER TABLE \`callout\`  DROP FOREIGN KEY \`FK_1e740008a7e1512966e3b084148\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP INDEX \`IDX_1e740008a7e1512966e3b08414\``
    );

    // Callout ==> contributionDefaults
    await queryRunner.query(
      `ALTER TABLE \`callout\`  DROP FOREIGN KEY \`FK_36b0da55acff774d0845aeb55f2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP INDEX \`IDX_36b0da55acff774d0845aeb55f\``
    );

    // Add in new structure
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`state\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`whiteboardTemplateId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`postTemplateId\` char(36) NULL`
    );

    // Move / create data

    // Add in constraints
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_c506eee0b7d06523b2953d07337\` FOREIGN KEY (\`whiteboardTemplateId\`) REFERENCES \`whiteboard_template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_22a2ec1b5bca6c54678ffb19eb0\` FOREIGN KEY (\`cardTemplateId\`) REFERENCES \`aspect_template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Drop old data / fields
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`contributionDefaultsId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`contributionPolicyId\``
    );
  }
}

enum CalloutType {
  POST = 'post',
  POST_COLLECTION = 'post-collection',
  WHITEBOARD = 'whiteboard',
  WHITEBOARD_RT = 'whiteboard-real-time',
  WHITEBOARD_COLLECTION = 'whiteboard-collection',
  LINK_COLLECTION = 'link-collection',
}

export enum ContributionType {
  POST = 'post',
  WHITEBOARD = 'whiteboard',
  LINK = 'link',
}
