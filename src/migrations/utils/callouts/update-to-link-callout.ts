import { QueryRunner } from 'typeorm';

export const updateToLinkCallout = async (
  queryRunner: QueryRunner,
  id: string
) => {
  return queryRunner.query(
    `UPDATE callout SET \`group\` = 'HOME_0'
     WHERE id = '${id}'`
  );
};
