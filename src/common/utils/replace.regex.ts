import { AgentInfo } from '@core/authentication';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { IpfsService } from '@services/adapters/ipfs/ipfs.service';
import { EntityManager, ObjectType } from 'typeorm';

type ReplacementCallback<T extends BaseAlkemioEntity> = (
  entityManager: EntityManager,
  entityClass: ObjectType<T>,
  ipfsService: IpfsService,
  storageBucketService: StorageBucketService,
  agentInfo: AgentInfo,
  regex: RegExp,
  matchedText: string,
  row: any
) => Promise<string>;

export async function replaceRegex<T extends BaseAlkemioEntity>(
  entityManager: EntityManager,
  entityClass: ObjectType<T>,
  ipfsService: IpfsService,
  storageBucketService: StorageBucketService,
  agentInfo: AgentInfo,
  columnName: string,
  regex: string,
  replacementCallback: ReplacementCallback<T>
): Promise<any> {
  const queryBuilder = entityManager.connection
    .getRepository(entityClass)
    .createQueryBuilder();
  const escapedColumn = queryBuilder.escape(columnName);
  // Fetch all rows with the matching regex
  const rows = await queryBuilder
    .select()
    .where(`${columnName} REGEXP :regex`)
    .setParameters({ regex })
    .getMany();

  // Update each row with the replaced text
  for (const row of rows) {
    const regExp = new RegExp(regex);
    const matchedText = (row as any)[columnName].match(regExp)[0];
    const replacementText = await replacementCallback(
      entityManager,
      entityClass,
      ipfsService,
      storageBucketService,
      agentInfo,
      regExp,
      matchedText,
      row
    );
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
