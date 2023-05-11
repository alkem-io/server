import { AgentInfo } from '@core/authentication';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { IpfsService } from '@services/adapters/ipfs/ipfs.service';
import { StorageBucketResolverService } from '@services/infrastructure/entity-resolver/storage.bucket.resolver.service';
import { EntityManager, ObjectType } from 'typeorm';

type ReplacementCallback<T extends BaseAlkemioEntity> = (
  entityManager: EntityManager,
  entityClass: ObjectType<T>,
  ipfsService: IpfsService,
  storageBucketService: StorageBucketService,
  storageBucketResolverService: StorageBucketResolverService,
  agentInfo: AgentInfo,
  regex: RegExp,
  matchedText: string,
  row: any,
  anonymousReadAccess: boolean
) => Promise<string | never>;

export async function replaceRegex<T extends BaseAlkemioEntity>(
  entityManager: EntityManager,
  entityClass: ObjectType<T>,
  ipfsService: IpfsService,
  storageBucketService: StorageBucketService,
  storageBucketResolverService: StorageBucketResolverService,
  agentInfo: AgentInfo,
  columnName: string,
  regex: string,
  anonymousReadAccess: boolean,
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
    try {
      const regExp = new RegExp(regex);
      const matchedText = (row as any)[columnName].match(regExp)[0];
      const replacementText = await replacementCallback(
        entityManager,
        entityClass,
        ipfsService,
        storageBucketService,
        storageBucketResolverService,
        agentInfo,
        regExp,
        matchedText,
        row,
        anonymousReadAccess
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
    } catch (error) {}
  }
}
