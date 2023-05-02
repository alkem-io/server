import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { EntityManager, ObjectType } from 'typeorm';

type ReplacementCallback = (matchedText: string) => string;

export async function replaceRegex<T extends BaseAlkemioEntity>(
  entityManager: EntityManager,
  entityClass: ObjectType<T>,
  columnName: string,
  regex: string,
  replacementCallback: ReplacementCallback
): Promise<any> {
  console.log('match');
  const queryBuilder = entityManager.connection
    .getRepository(entityClass)
    .createQueryBuilder();
  const escapedColumn = queryBuilder.escape(columnName);

  // Fetch all rows with the matching regex
  const rows = await queryBuilder
    .select()
    .where(`${escapedColumn} REGEXP :regex`)
    .setParameters({ regex })
    .getMany();

  // Update each row with the replaced text
  for (const row of rows) {
    console.log('match');
    const matchedText = (row as any)[columnName].match(new RegExp(regex))[0];
    const replacementText = replacementCallback(matchedText);
    console.log('match');
    await queryBuilder
      .update(entityClass)
      .set({
        [columnName]: () =>
          `REGEXP_REPLACE(${escapedColumn}, :regex, :replacementText)`,
      } as any)
      .setParameters({ regex, replacementText })
      .where('id = :id', { id: row.id })
      .execute();
  }
}
