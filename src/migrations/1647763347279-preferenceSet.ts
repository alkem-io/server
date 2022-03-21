import { MigrationInterface, QueryRunner } from 'typeorm';

export class preferenceSet1647763347279 implements MigrationInterface {
  name = 'preferenceSet1647763347279';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the definition of preferenceSet + add to User, Hub
    await queryRunner.query(
      `CREATE TABLE \`preference_set\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`authorizationId\` char(36) NULL, UNIQUE INDEX \`REL_8888dccdda9ba57d8e3a634cd8\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_set\` ADD CONSTRAINT \`FK_88885901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`preferenceSetId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD UNIQUE INDEX \`IDX_88880355b4e9bd6b02c66507aa\` (\`preferenceSetId\`)`
    );

    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`preferenceSetId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD UNIQUE INDEX \`IDX_99990355b4e9bd6b02c66507aa\` (\`preferenceSetId\`)`
    );

    // add column to preference to point to a preferenceSetId
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD \`preferenceSetId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD CONSTRAINT \`FK_88881fbd1fef95a0540f7e7d1e2\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );

    // for each hub:
    // create authorization ID for new preference set
    // create preferenceSet
    // add column for preferenceSetId on Hub + set to value above

    // Find all preferences that pointed to this hub
    // Update all preferences for the Hub above updated to point to the newly created preference set
    // remove the hubId colum on preference

    // repeat for users

    // add for organizations + challenges
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
