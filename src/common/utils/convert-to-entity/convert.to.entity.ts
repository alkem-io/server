import { PrefixKeys } from '@src/types';

/**
 * Expects a raw entity as input and converts it to a full typeorm entity.
 * The raw input is returned as a result from building typerom queries
 * and returned the result as raw data.
 * The entity usually is prefixed with the alias of the joined table.
 *
 * Example:
 * await this.calendarRepository
 *  .createQueryBuilder('calendar')
 *  .where({ id: calendarId })
 *  .leftJoinAndSelect(
 *    'space',
 *    'space',
 *    'space.collaborationId = collaboration.id'
 *  )
 *  .getRawOne<PrefixKeys<Space, 'space_'>>();
 *
 *  const space = convertToEntity(rawSpace, 'space_');
 *
 * @param prefixedEntity
 * @param prefix
 */
export const convertToEntity = <
  T extends Record<string, any>,
  P extends string,
>(
  prefixedEntity: PrefixKeys<T, P>,
  prefix: P
): T => {
  return Object.keys(prefixedEntity).reduce((acc, key) => {
    const newKey = key.replace(prefix, '') as keyof T;
    acc[newKey] = prefixedEntity[
      key as keyof PrefixKeys<T, P>
    ] as unknown as T[keyof T];
    return acc;
  }, {} as T);
};
