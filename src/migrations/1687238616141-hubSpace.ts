import { MigrationInterface, QueryRunner } from 'typeorm';
import { escapeString } from './utils/escape-string';

export class hubSpace1687238616141 implements MigrationInterface {
  name = 'hubSpace1687238616141';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Challenge ==> parentHub
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_494b27cb13b59128fb24b365ca6`'
    );
    // Hub ==> Agent
    await queryRunner.query(
      'ALTER TABLE `hub` DROP FOREIGN KEY `FK_b0c3f360534db92017e36a00bb2`'
    );
    // Hub ==> Authorization
    await queryRunner.query(
      'ALTER TABLE `hub` DROP FOREIGN KEY `FK_17a161eef37c9f07186532ab758`'
    );
    // Hub ==> Collaboration
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_6325f4ef25c4e07e723a96ed37c\``
    );

    // Hub ==> Community
    await queryRunner.query(
      'ALTER TABLE `hub` DROP FOREIGN KEY `FK_f5ad15bcb06a95c2a109fbcce2a`'
    );

    // Hub ==> Context
    await queryRunner.query(
      'ALTER TABLE `hub` DROP FOREIGN KEY `FK_6db8627abbf00b1b986e359054f`'
    );

    // Hub ==> Lifecycle
    await queryRunner.query(
      'ALTER TABLE `hub` DROP FOREIGN KEY `FK_ec1a68698d32f610a5fc1880c7f`'
    );

    // Hub ==> PreferenceSet
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY FK_6bf7adf4308991457fdb04624e2;`
    );
    // Hub ==> Profile
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_71231450cf75dc486700ca034c6\``
    );
    // Hub ==> StorageBucket
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_11991450cf75dc486700ca034c6\``
    );
    // Hub ==> TemplatesSet
    await queryRunner.query(
      'ALTER TABLE `hub` DROP FOREIGN KEY `FK_33336901817dd09d5906537e088`'
    );
    // Hub ==> Timeline
    await queryRunner.query(
      'ALTER TABLE `hub` DROP FOREIGN KEY `FK_3005ed9ce3f57c250c59d6d5065`'
    );

    await queryRunner.query('ALTER TABLE hub RENAME TO space');
    await queryRunner.query(
      `ALTER TABLE \`challenge\` RENAME COLUMN \`parentHubId\` TO \`parentSpaceId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` RENAME COLUMN \`hubId\` TO \`spaceId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` RENAME COLUMN \`hubId\` TO \`spaceId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` RENAME COLUMN \`hubID\` TO \`spaceID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` RENAME COLUMN \`hubID\` TO \`spaceID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` RENAME COLUMN \`hubID\` TO \`spaceID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` RENAME COLUMN \`hubID\` TO \`spaceID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` RENAME COLUMN \`hubID\` TO \`spaceID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` RENAME COLUMN \`hubListFilter\` TO \`spaceListFilter\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` RENAME COLUMN \`hubVisibilityFilter\` TO \`spaceVisibilityFilter\``
    );

    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_494b27cb13b59128fb24b365ca6` FOREIGN KEY (`parentSpaceId`) REFERENCES `space`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `space` ADD CONSTRAINT `FK_b0c3f360534db92017e36a00bb2` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `space` ADD CONSTRAINT `FK_17a161eef37c9f07186532ab758` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_6325f4ef25c4e07e723a96ed37c\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `space` ADD CONSTRAINT `FK_f5ad15bcb06a95c2a109fbcce2a` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `space` ADD CONSTRAINT `FK_6db8627abbf00b1b986e359054f` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `space` ADD CONSTRAINT `FK_ec1a68698d32f610a5fc1880c7f` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT FK_6bf7adf4308991457fdb04624e2 FOREIGN KEY (preferenceSetId) REFERENCES preference_set(id) ON DELETE SET NULL;`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_71231450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_11991450cf75dc486700ca034c6\` FOREIGN KEY (\`storageBucketId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_33336901817dd09d5906537e088\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `space` ADD CONSTRAINT `FK_3005ed9ce3f57c250c59d6d5065` FOREIGN KEY (`timelineID`) REFERENCES `timeline`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );

    // Update existing community entries to set the type properly
    const communities: { id: string; type: string }[] = await queryRunner.query(
      `SELECT id, type FROM community`
    );
    for (const community of communities) {
      const newType = community.type.replace('hub', 'space');
      await queryRunner.query(
        `UPDATE community SET type='${newType}' WHERE id='${community.id}'`
      );
    }

    // Update existing credential entries to set the type properly
    const credentials: { id: string; type: string }[] = await queryRunner.query(
      `SELECT id, type FROM credential`
    );
    for (const credential of credentials) {
      const newType = credential.type.replace('hub', 'space');
      await queryRunner.query(
        `UPDATE credential SET type='${newType}' WHERE id='${credential.id}'`
      );
    }

    // Update existing community policies to have right credential names
    const communityPolicies: { id: string; member: string; lead: string }[] =
      await queryRunner.query(`SELECT id, member, lead FROM community_policy`);
    for (const commununityPolicy of communityPolicies) {
      const newMember = commununityPolicy.member.replace('hub', 'space');
      const newLead = commununityPolicy.lead.replace('hub', 'space');
      await queryRunner.query(
        `UPDATE community_policy SET member='${escapeString(
          newMember
        )}', lead='${escapeString(newLead)}' WHERE id='${commununityPolicy.id}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Challenge ==> parentHub
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_494b27cb13b59128fb24b365ca6`'
    );
    // Space ==> Agent
    await queryRunner.query(
      'ALTER TABLE `space` DROP FOREIGN KEY `FK_b0c3f360534db92017e36a00bb2`'
    );
    // Space ==> Authorization
    await queryRunner.query(
      'ALTER TABLE `space` DROP FOREIGN KEY `FK_17a161eef37c9f07186532ab758`'
    );
    // Space ==> Collaboration
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_6325f4ef25c4e07e723a96ed37c\``
    );

    // Space ==> Community
    await queryRunner.query(
      'ALTER TABLE `space` DROP FOREIGN KEY `FK_f5ad15bcb06a95c2a109fbcce2a`'
    );

    // Space ==> Context
    await queryRunner.query(
      'ALTER TABLE `space` DROP FOREIGN KEY `FK_6db8627abbf00b1b986e359054f`'
    );

    // Space ==> Lifecycle
    await queryRunner.query(
      'ALTER TABLE `space` DROP FOREIGN KEY `FK_ec1a68698d32f610a5fc1880c7f`'
    );

    // Space ==> PreferenceSet
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY FK_6bf7adf4308991457fdb04624e2;`
    );
    // Space ==> Profile
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_71231450cf75dc486700ca034c6\``
    );
    // Space ==> StorageBucket
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_11991450cf75dc486700ca034c6\``
    );
    // Space ==> TemplatesSet
    await queryRunner.query(
      'ALTER TABLE `space` DROP FOREIGN KEY `FK_33336901817dd09d5906537e088`'
    );
    // Space ==> Timeline
    await queryRunner.query(
      'ALTER TABLE `space` DROP FOREIGN KEY `FK_3005ed9ce3f57c250c59d6d5065`'
    );

    await queryRunner.query('ALTER TABLE space RENAME TO hub');
    await queryRunner.query(
      `ALTER TABLE \`challenge\` RENAME COLUMN \`parentSpaceId\` TO \`parentHubId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` RENAME COLUMN \`spaceId\` TO \`hubId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` RENAME COLUMN \`spaceId\` TO \`hubId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` RENAME COLUMN \`spaceID\` TO \`hubID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` RENAME COLUMN \`spaceID\` TO \`hubID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` RENAME COLUMN \`spaceID\` TO \`hubID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` RENAME COLUMN \`spaceID\` TO \`hubID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` RENAME COLUMN \`spaceID\` TO \`hubID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` RENAME COLUMN \`spaceListFilter\` TO \`hubListFilter\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` RENAME COLUMN \`spaceVisibilityFilter\` TO \`hubVisibilityFilter\``
    );

    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_494b27cb13b59128fb24b365ca6` FOREIGN KEY (`parentHubId`) REFERENCES `hub`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `hub` ADD CONSTRAINT `FK_b0c3f360534db92017e36a00bb2` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `hub` ADD CONSTRAINT `FK_17a161eef37c9f07186532ab758` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_6325f4ef25c4e07e723a96ed37c\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `hub` ADD CONSTRAINT `FK_f5ad15bcb06a95c2a109fbcce2a` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `hub` ADD CONSTRAINT `FK_6db8627abbf00b1b986e359054f` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `hub` ADD CONSTRAINT `FK_ec1a68698d32f610a5fc1880c7f` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT FK_6bf7adf4308991457fdb04624e2 FOREIGN KEY (preferenceSetId) REFERENCES preference_set(id) ON DELETE SET NULL;`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_71231450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_11991450cf75dc486700ca034c6\` FOREIGN KEY (\`storageBucketId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_33336901817dd09d5906537e088\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `hub` ADD CONSTRAINT `FK_3005ed9ce3f57c250c59d6d5065` FOREIGN KEY (`timelineID`) REFERENCES `timeline`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );

    // Update existing community entries to set the type properly
    const communities: { id: string; type: string }[] = await queryRunner.query(
      `SELECT id, type FROM community`
    );
    for (const community of communities) {
      const newType = community.type.replace('space', 'hub');
      await queryRunner.query(
        `UPDATE community SET type='${newType}' WHERE id='${community.id}'`
      );
    }

    // Update existing credential entries to set the type properly
    const credentials: { id: string; type: string }[] = await queryRunner.query(
      `SELECT id, type FROM credential`
    );
    for (const credential of credentials) {
      const newType = credential.type.replace('space', 'hub');
      await queryRunner.query(
        `UPDATE credential SET type='${newType}' WHERE id='${credential.id}'`
      );
    }

    // Update existing community policies to have right credential names
    const communityPolicies: { id: string; member: string; lead: string }[] =
      await queryRunner.query(`SELECT id, member, lead FROM community_policy`);
    for (const commununityPolicy of communityPolicies) {
      const newMember = commununityPolicy.member.replace('space', 'hub');
      const newLead = commununityPolicy.lead.replace('space', 'hub');
      await queryRunner.query(
        `UPDATE community_policy SET member='${escapeString(
          newMember
        )}', lead='${escapeString(newLead)}' WHERE id='${commununityPolicy.id}'`
      );
    }
  }
}
