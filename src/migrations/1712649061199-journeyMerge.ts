import { MigrationInterface, QueryRunner } from 'typeorm';

export class journeyMerge1712649061199 implements MigrationInterface {
  name = 'journeyMerge1712649061199';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // await queryRunner.query(
    //   `ALTER TABLE \`space\` ADD \`parentSpaceId\` char(36) NULL`
    // );

    // There should not be a unique constraint from space to account; yes the other way around
    // await queryRunner.query(
    //   `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_6bdeffaf6ea6159b4672a2aed70\``
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`space\` DROP INDEX \`IDX_6bdeffaf6ea6159b4672a2aed7\``
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`space\` DROP INDEX \`REL_6bdeffaf6ea6159b4672a2aed7\``
    // );

    // // // Challenge constraints
    // await queryRunner.query(
    //   `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_178fa41e46fd331f3501a62f6bf\`` // authorizationId FK
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_d4551f18fed106ae2e20c70f7cb\`` // collaborationId FK
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_b025a2720e5ee0e5b38774f7a8c\`` // agentId FK
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_aa9668dd2340c2d794b414577b6\`` // communityId FK
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_81231450cf75dc486700ca034c6\`` // profileId FK
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_494b27cb13b59128fb24b365ca6\`` // parentSpaceId FK
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_2224d59c0b805c9c1ecb0070e16\`` // storageAggregator FK
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_1deebaabfc620e881858333b0d0\`` // contextId FK
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_78017461e03bd2a6cd47044bf6a\`` // account FK
    // );

    // await queryRunner.query(
    //   `ALTER TABLE \`challenge\` DROP INDEX \`REL_178fa41e46fd331f3501a62f6b\`` // authorizationId
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`challenge\` DROP INDEX \`REL_1deebaabfc620e881858333b0d\`` // contextId
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`challenge\` DROP INDEX \`REL_aa9668dd2340c2d794b414577b\`` // communityId
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`challenge\` DROP INDEX \`REL_b025a2720e5ee0e5b38774f7a8\`` // agentId
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`challenge\` DROP INDEX \`IDX_d4551f18fed106ae2e20c70f7c\`` // collaborationId
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`challenge\` DROP INDEX \`IDX_eedbe52ec6041ac337528d3dd0\`` // profileId
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`challenge\` DROP INDEX \`IDX_0ec10c5ca99e2b7bbdeeaf6ff0\`` // storageAggregatorId
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`challenge\` DROP INDEX \`FK_494b27cb13b59128fb24b365ca6\`` // spaceId
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`challenge\` DROP INDEX \`FK_78017461e03bd2a6cd47044bf6a\`` // accountId
    // );

    // // Opportunity constraints
    // await queryRunner.query(
    //   `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_a344b754f33792cbbc58e41e898\`` // authorizationId FK
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_fa617e79d6b2926edc7b4a3878f\`` // collaborationId FK
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_c814aa7dc8a68f27d96d5d1782c\`` // agentId FK
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_1c7744df92f39ab567084fd8c09\`` // communityId FK
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_91231450cf75dc486700ca034c6\`` // profileId FK
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_0e2c355dbb2950851dbc17a4490\`` // parentChallenge FK
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_89894d59c0b805c9c1ecb0070e16\`` // storageAggregator FK
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_9c169eb500e2d3823154c7b603d\`` // contextId FK
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_69e32f4f4652f654dc8641ae2b8\`` // account FK
    // );

    // await queryRunner.query(
    //   `ALTER TABLE \`opportunity\` DROP INDEX \`IDX_313c12afe69143a9ee3779b4f6\`` // rowId
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`opportunity\` DROP INDEX \`REL_a344b754f33792cbbc58e41e89\`` // authorizationId
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`opportunity\` DROP INDEX \`REL_9c169eb500e2d3823154c7b603\`` // contextId
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`opportunity\` DROP INDEX \`REL_1c7744df92f39ab567084fd8c0\`` // communityId
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`opportunity\` DROP INDEX \`REL_c814aa7dc8a68f27d96d5d1782\`` // agentId
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`opportunity\` DROP INDEX \`IDX_fa617e79d6b2926edc7b4a3878\`` // collaborationId
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`opportunity\` DROP INDEX \`FK_0e2c355dbb2950851dbc17a4490\`` // challengeId
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`opportunity\` DROP INDEX \`FK_91231450cf75dc486700ca034c6\`` // profileId
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`opportunity\` DROP INDEX \`IDX_28129cec24e65cc8340ecd1284\`` // profileId
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`opportunity\` DROP INDEX \`IDX_8488dda5c509a57e6070e8c3b0\`` // storageAggregatorId
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`opportunity\` DROP INDEX \`FK_89894d59c0b805c9c1ecb0070e16\`` // FK_89894d59c0b805c9c1ecb0070e16
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`opportunity\` DROP INDEX \`FK_69e32f4f4652f654dc8641ae2b8\`` // accountId
    // );

    // TBD: rowID + issues with pagination?
    const challenges: any[] = await queryRunner.query(`SELECT id,
                                          version, nameID, authorizationID,
                                          contextId, communityId, agentId,
                                          spaceId, collaborationId, profileId,
                                          storageAggregatorId, accountId, type,
                                          settingsStr, level
                                          FROM challenge`);
    for (const challenge of challenges) {
      await queryRunner.query(`INSERT INTO space (id,
                                          version, nameID, authorizationID,
                                          contextId, communityId, agentId,
                                          parentSpaceId, collaborationId, profileId,
                                          storageAggregatorId, accountId, type,
                                          settingsStr, level)
                                          VALUES (
                                            '${challenge.id}',
                                            '${challenge.version}', '${challenge.nameID}', '${challenge.authorizationID}',
                                            '${challenge.contextId}', '${challenge.communityId}', '${challenge.agentId}',
                                            '${challenge.spaceId}', '${challenge.collaborationId}', '${challenge.profileId}',
                                            '${challenge.storageAggregatorId}', '${challenge.accountId}', '${challenge.type}',
                                            '${challenge.settingsStr}', '1
                                          )`);

      // Set the created / updated date based on old values; strings gave an issue so needs to be done at the db level
      await queryRunner.query(
        `UPDATE space SET createdDate = (SELECT createdDate FROM challenge WHERE challenge.id = '${challenge.id}') WHERE (space.id = '${challenge.id}');`
      );
      await queryRunner.query(
        `UPDATE space SET updatedDate = (SELECT updatedDate FROM challenge WHERE challenge.id = '${challenge.id}') WHERE (space.id = '${challenge.id}');`
      );
    }

    const opportunities: any[] = await queryRunner.query(`SELECT id,
                                          version, nameID, authorizationID,
                                          contextId, communityId, agentId,
                                          challengeId, collaborationId, profileId,
                                          storageAggregatorId, accountId, type,
                                          settingsStr, level
                                          FROM opportunity`);
    for (const opportunity of opportunities) {
      await queryRunner.query(`INSERT INTO space (id,
                                          version, nameID, authorizationID,
                                          contextId, communityId, agentId,
                                          parentSpaceId, collaborationId, profileId,
                                          storageAggregatorId, accountId, type,
                                          settingsStr, level)
                                          VALUES (
                                            '${opportunity.id}',
                                            '${opportunity.version}', '${opportunity.nameID}', '${opportunity.authorizationID}',
                                            '${opportunity.contextId}', '${opportunity.communityId}', '${opportunity.agentId}',
                                            '${opportunity.challengeId}', '${opportunity.collaborationId}', '${opportunity.profileId}',
                                            '${opportunity.storageAggregatorId}', '${opportunity.accountId}', '${opportunity.type}',
                                            '${opportunity.settingsStr}', 2
                                          )`);
      // Set the created / updated date based on old values; strings gave an issue so needs to be done at the db level
      await queryRunner.query(
        `UPDATE space SET createdDate = (SELECT createdDate FROM opportunity WHERE opportunity.id = '${opportunity.id}') WHERE (space.id = '${opportunity.id}');`
      );
      await queryRunner.query(
        `UPDATE space SET updatedDate = (SELECT updatedDate FROM opportunity WHERE opportunity.id = '${opportunity.id}') WHERE (space.id = '${opportunity.id}');`
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_ef1ff4ac7f613cc0677e2295b30\` FOREIGN KEY (\`parentSpaceId\`) REFERENCES \`space\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    // TBD: subspaces relationship FK to be added
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
