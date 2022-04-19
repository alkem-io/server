import { QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export type PreferenceInsertType = {
  value: string;
  definitionId: string;
};

export const addPreferencesToUsers = async (
  queryRunner: QueryRunner,
  preferences: PreferenceInsertType[]
) => {
  const users: { id: string; preferenceSetId: string }[] =
    await queryRunner.query('SELECT id, preferenceSetId FROM user');

  const prefValues: string[] = [];
  for (const user of users) {
    const defAuthUUIDs = preferences.map(() => randomUUID());
    const authValues = preferences.map(
      (x, i) => `('${defAuthUUIDs[i]}', NOW(), NOW(), 1, '', '', 0, '')`
    );
    const authValue = authValues.join(',\n');
    await queryRunner.query(
      `INSERT INTO authorization_policy VALUES ${authValue}`
    );

    prefValues.push(
      ...preferences.map(
        (x, i) =>
          `(UUID(), NOW(), NOW(), 1, 'true', '${defAuthUUIDs[i]}', '${x.definitionId}', '${user.preferenceSetId}')`
      )
    );
  }

  const prefValue = prefValues.join(',\n');
  await queryRunner.query(`INSERT INTO preference VALUES ${prefValue}`);
};
