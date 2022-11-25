import { QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export type DefinitionInsertTypeWithDefault = {
  definitionSet: string;
  group: string;
  displayName: string;
  description: string;
  valueType: string;
  type: string;
  defaultValue: string;
};

export type PreferenceTypeResult = {
  uuid: string;
  defaultValue: string;
};

export const addPreferenceDefinitionsWithDefault = async (
  queryRunner: QueryRunner,
  definitions: DefinitionInsertTypeWithDefault[]
): Promise<PreferenceTypeResult[]> => {
  const defUUIDs = definitions.map(() => randomUUID());
  const values = definitions.map(
    (x, i) =>
      `('${defUUIDs[i]}', 1, '${x.definitionSet}', '${x.group}', '${x.displayName}', '${x.description}', '${x.valueType}', '${x.type}')`
  );
  const value = values.join(',\n');
  // new definitions
  await queryRunner.query(
    `INSERT INTO preference_definition (id, version, definitionSet, groupName, displayName, description, valueType, type)
    VALUES
      ${value}`
  );

  const results: PreferenceTypeResult[] = definitions.map((x, i) => {
    const uuid = defUUIDs[i];
    return {
      uuid,
      defaultValue: x.defaultValue,
    };
  });

  return results;
};
