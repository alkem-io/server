/***
 * Selects only keys which values are an object
 */
export type EntityRelations<Entity = any> = {
  [P in keyof Entity]: Entity[P] extends
    | string
    | number
    | symbol
    | boolean
    | (() => any)
    ? never
    : P;
}[keyof Entity];
