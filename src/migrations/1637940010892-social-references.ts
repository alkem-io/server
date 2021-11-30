import { MigrationInterface, QueryRunner } from 'typeorm';
import { RandomGenerator } from 'typeorm/util/RandomGenerator';

const newReferenceNames = [
  {
    name: 'github',
    description: 'Your Github account',
  },
  {
    name: 'linkedin',
    description: 'Your LinkedIn account',
  },
  {
    name: 'twitter',
    description: 'Your Twitter account',
  },
];

export class socialReferences1637940010892 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // select user profileId
    const users: any[] = await queryRunner.query(`SELECT profileId from user`);
    users.forEach(async user =>
      newReferenceNames.forEach(async ({ name, description }) => {
        // does ref with this name exist
        const [refExists] = await queryRunner.query(
          `SELECT id FROM reference
               where profileId = '${user.profileId}' and LOWER(name) = '${name}'
               limit 1`
        );

        if (!refExists) {
          // create auth policy
          const authId = RandomGenerator.uuid4();
          await queryRunner.query(
            //console.log(
            `insert into authorization_policy
            values ('${authId}', NOW(), NOW(), 1, '', '', 0)`
          );
          // insert reference
          await queryRunner.query(
            //console.log(
            `INSERT INTO reference (id, version, name, uri, description, authorizationId, profileId)
                  values (UUID(), 1, '${name}', '', '${description}', '${authId}', '${user.profileId}')`
          );
        }
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
