import { ClassificationEntry } from '@domain/space/classification.entry/classification.entry.entity';
import { IClassificationEntry } from '@domain/space/classification.entry/classification.entry.interface';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';

/**
 * Batches `SpaceAbout.classifications` resolution across one request: a list
 * of parents (a Spaces query selecting `about { classifications }`) issues a
 * single IN query instead of one query per About. Results per key keep the
 * canonical read order (sortOrder ASC — I-6/FR-018b), and an About with no
 * entries resolves to `[]`, never an error (council operator:Q6).
 *
 * Grouping uses getRawAndEntities because the FK is not exposed as an entity
 * column: the raw row carries `spaceAboutId` for its positionally-matched
 * entity.
 */
@Injectable()
export class SpaceAboutClassificationsLoaderCreator
  implements DataLoaderCreator<IClassificationEntry[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(_options?: DataLoaderCreatorOptions<IClassificationEntry[]>) {
    return new DataLoader<string, IClassificationEntry[]>(
      async keys => {
        const { entities, raw } = await this.manager
          .getRepository(ClassificationEntry)
          .createQueryBuilder('entry')
          .addSelect('entry."spaceAboutId"', 'groupKey')
          .where('entry."spaceAboutId" IN (:...keys)', { keys: [...keys] })
          .orderBy('entry.sortOrder', 'ASC')
          .getRawAndEntities();

        const byAboutId = new Map<string, IClassificationEntry[]>();
        entities.forEach((entity, index) => {
          const groupKey: string = raw[index].groupKey;
          const group = byAboutId.get(groupKey);
          if (group) {
            group.push(entity);
          } else {
            byAboutId.set(groupKey, [entity]);
          }
        });
        return keys.map(key => byAboutId.get(key) ?? []);
      },
      { name: this.constructor.name }
    );
  }
}
