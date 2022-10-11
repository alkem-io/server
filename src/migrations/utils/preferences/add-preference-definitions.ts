import { QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export type DefinitionInsertType = {
  definitionSet: string;
  group: string;
  displayName: string;
  description: string;
  valueType: string;
  type: string;
};

export const addPreferenceDefinitions = async (
  queryRunner: QueryRunner,
  definitions: DefinitionInsertType[]
): Promise<string[]> => {
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

  return defUUIDs;
};
