/**
 * A utility type that takes a type T, and a string prefix as inputs
 * and returns a new type with the T keys prefixed with the given string.
 *
 * Very helpful when building typeorm queries using getRawOne or getRawMany
 * Note: Typeorm prefixes the keys with `alias_`, be sure to add the underscore
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
 */
export type PrefixKeys<T, P extends string> = {
  [K in keyof T as `${P}${string & K}`]: T[K];
};
