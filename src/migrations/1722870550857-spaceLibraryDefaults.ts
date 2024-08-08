import { MigrationInterface, QueryRunner } from 'typeorm';

export class SpaceLibraryDefaults1722870550857 implements MigrationInterface {
  name = 'SpaceLibraryDefaults1722870550857';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`libraryId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD UNIQUE INDEX \`IDX_43559aeadc1a5169d17e81b3d4\` (\`libraryId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`defaultsId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD UNIQUE INDEX \`IDX_6b1efee39d076d9f7ecb8fef4c\` (\`defaultsId\`)`
    );

    await queryRunner.query(
      `ALTER TABLE \`account\` DROP FOREIGN KEY \`FK_9542f2ad51464f961e5b5b5b582\``
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` DROP FOREIGN KEY \`FK_bea623a346d2e3f88dd0aeef576\``
    );

    const templateTableNames = [
      'whiteboard_template',
      'callout_template',
      'post_template',
      'community_guidelines_template',
      'innovation_flow_template',
    ];

    const accounts: {
      id: string;
      spaceId: string;
      defaultsId: string;
      libraryId: string;
    }[] = await queryRunner.query(
      `SELECT id, spaceId, defaultsId, libraryId FROM \`account\``
    );
    for (const account of accounts) {
      if (account.spaceId) {
        await queryRunner.query(
          `UPDATE \`space\` SET defaultsId = '${account.defaultsId}', libraryId = '${account.libraryId}' WHERE id = '${account.spaceId}'`
        );
        const storageAggregatorID = await this.getStorageAggregatorForSpace(
          queryRunner,
          account.spaceId
        );
        // Update the storage aggregator hierarchy for the TemplatesSet?
        for (const templateTableName of templateTableNames) {
          await this.updateStorageAggregatorForTemplates(
            queryRunner,
            account.libraryId,
            templateTableName,
            storageAggregatorID
          );
        }
      }
    }

    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_9542f2ad51464f961e5b5b5b582\` FOREIGN KEY (\`defaultsId\`) REFERENCES \`space_defaults\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_bea623a346d2e3f88dd0aeef576\` FOREIGN KEY (\`libraryId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`account\` DROP COLUMN \`defaultsId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` DROP COLUMN \`libraryId\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async getStorageAggregatorForSpace(
    queryRunner: QueryRunner,
    spaceID: string
  ): Promise<string> {
    const [space]: {
      id: string;
      storageAggregatorId: string;
    }[] = await queryRunner.query(
      `SELECT id, storageAggregatorId FROM space WHERE id = '${spaceID}'`
    );
    if (space) {
      return space.storageAggregatorId;
    }
    throw new Error(
      `Unable to retrieve storage aggregator for spaceID: ${spaceID}`
    );
  }

  private async updateStorageAggregatorForTemplates(
    queryRunner: QueryRunner,
    templatesSetID: string,
    templateTableName: string,
    storageAggregatorId: string
  ): Promise<void> {
    const templates: {
      id: string;
      profileId: string;
    }[] = await queryRunner.query(
      `SELECT id, profileId  FROM \`${templateTableName}\` where templatesSetId = '${templatesSetID}'`
    );
    for (const template of templates) {
      const [profile]: {
        id: string;
        storageBucketId: string;
      }[] = await queryRunner.query(
        `SELECT id, storageBucketId FROM profile WHERE id = '${template.profileId}'`
      );
      if (profile) {
        await queryRunner.query(
          `UPDATE \`storage_bucket\` SET storageAggregatorId = '${storageAggregatorId}' WHERE id = '${profile.storageBucketId}'`
        );
      }
    }
  }
}
