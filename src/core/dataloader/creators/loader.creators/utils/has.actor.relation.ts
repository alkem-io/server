import { Type } from '@nestjs/common';
import { EntityManager } from 'typeorm';

/**
 * Checks whether the given entity class has an `actor` TypeORM relation.
 * Actor-based entities (User, Organization, VirtualContributor, Account, Space)
 * delegate properties like `profile`, `authorization`, and `credentials`
 * to their actor relation via TypeScript getters. These properties are NOT
 * direct TypeORM relations, so queries must join through `actor` instead.
 */
export const hasActorRelation = (
  manager: EntityManager,
  classRef: Type<any>
): boolean => {
  const metadata = manager.connection.getMetadata(classRef);
  return metadata.relations.some(r => r.propertyName === 'actor');
};
