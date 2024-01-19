import { MigrationInterface, QueryRunner } from 'typeorm';
import * as console from 'console';

type DataType = {
  parent: string;
  refChildId: string;
  child: string;
  childId: string;
  constraint: string;
};

export class test1705675807293 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const children: { child: string }[] = await queryRunner.query(`
        SELECT REFERENCED_TABLE_NAME as child
        FROM
            INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE
            REFERENCED_TABLE_SCHEMA = 'alkemio' AND
            REFERENCED_TABLE_NAME IS NOT NULL
        group by child;
      `);

    const a: DataType[] = await queryRunner.query(`
        SELECT
          TABLE_NAME as parent,
          COLUMN_NAME as refChildId,
          REFERENCED_TABLE_NAME as child,
          REFERENCED_COLUMN_NAME as childId,
          CONSTRAINT_NAME as 'constraint'
        FROM
            INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE
            REFERENCED_TABLE_SCHEMA = 'alkemio' AND
            REFERENCED_TABLE_NAME IS NOT NULL;
      `);

    const results = [];
    for (const { child } of children) {
      const statement2 = `
        SELECT child.*
        FROM \`${child}\` as child
        WHERE ${constructWhereClause(a, child)}
      `;
      const result = await queryRunner.query(statement2);
      results.push([child, result.length]);
    }

    console.log(results);

    throw new Error('Reverting migration');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

const constructWhereClause = (data: DataType[], childName: string) => {
  const recordsForChild = data.filter(d => d.child === childName);

  if (!recordsForChild.length) {
    return '';
  }

  const firstRecord = recordsForChild.shift()!;

  const firstStatement = `NOT EXISTS (
    SELECT 1
    FROM \`${firstRecord.parent}\`
    WHERE child.id = \`${firstRecord.parent}\`.\`${firstRecord.refChildId}\`
  )`;

  if (recordsForChild.length === 0) {
    return firstStatement;
  }

  const otherStatements = recordsForChild.map(
    ({ parent, refChildId }) => `
    AND NOT EXISTS (
      SELECT 1
      FROM \`${parent}\`
      WHERE child.id = \`${parent}\`.\`${refChildId}\`
    )`
  );

  return `${firstStatement}${otherStatements.join('')}`;
};

const constructWhereClause2 = (data: DataType[], childName: string) => {
  const recordsForChild = data.filter(d => d.child === childName);

  if (!recordsForChild.length) {
    return '';
  }

  const firstRecord = recordsForChild.shift()!;

  const firstStatement = `(EXISTS (
        SELECT 1
        FROM \`${firstRecord.parent}\` c1
        WHERE child.id = \`${firstRecord.parent}\`.\`${firstRecord.refChildId}\`
    ) OR NOT EXISTS (
        SELECT 1
        FROM ChildTable1 c1
        WHERE c1.ParentId = p.Id
    ))`;

  // const firstStatement =  `NOT EXISTS (
  //   SELECT 1
  //   FROM \`${firstRecord.parent}\`
  //   WHERE child.id = \`${firstRecord.parent}\`.\`${firstRecord.refChildId}\`
  // )`;

  //   (EXISTS (
  //     SELECT 1
  //   FROM ChildTable1 c1
  //   WHERE c1.ParentId = p.Id
  // ) OR NOT EXISTS (
  //     SELECT 1
  //   FROM ChildTable1 c1
  //   WHERE c1.ParentId = p.Id
  // ))

  if (recordsForChild.length === 0) {
    return firstStatement;
  }

  const otherStatements = recordsForChild.map(
    ({ parent, refChildId }) => `
    AND NOT EXISTS (
      SELECT 1
      FROM \`${parent}\`
      WHERE child.id = \`${parent}\`.\`${refChildId}\`
    )`
  );

  return `${firstStatement}${otherStatements.join('')}`;
};
