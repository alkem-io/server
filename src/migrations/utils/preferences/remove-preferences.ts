import { QueryRunner } from 'typeorm';

/***
 * Removes the definition and each preference and authorization per definition
 */
export const removePreferences = async (
  queryRunner: QueryRunner,
  definitionType: string[]
) => {
  const types = definitionType.map(x => `'${x}'`).join(',');
  const prefDefs: { id: string }[] = await queryRunner.query(
    `SELECT id FROM preference_definition WHERE type in (${types})`
  );
  const prefDefIds = prefDefs.map(x => `'${x.id}'`).join(',');

  const prefAuths: { authorizationId: string }[] = await queryRunner.query(
    `SELECT authorizationId FROM preference WHERE preferenceDefinitionId in (${prefDefIds})`
  );
  const prefAuthIds = prefAuths.map(x => `'${x.authorizationId}'`).join(',');

  await queryRunner.query(
    `DELETE FROM preference WHERE preferenceDefinitionId in (${prefDefIds})`
  );
  await queryRunner.query(
    `DELETE FROM preference_definition WHERE id in (${prefDefIds})`
  );
  await queryRunner.query(
    `DELETE FROM authorization_policy WHERE id in (${prefAuthIds})`
  );
};
