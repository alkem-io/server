/**
 * TypeORM compatibility stubs.
 *
 * These types and functions were used by pagination and filtering utilities
 * that depend on TypeORM's SelectQueryBuilder. After the Drizzle ORM migration,
 * these utilities need to be rewritten using Drizzle's query builder.
 *
 * For now, these stubs allow the code to compile without the TypeORM package.
 * The pagination/filtering functions that use these stubs do NOT work at runtime
 * and must be rewritten before production use.
 *
 * TODO: Rewrite pagination (relay.style.pagination.fn.ts, pagination.fn.ts)
 *       and filtering (filter.fn.ts, organizationFilter.ts, userFilter.ts)
 *       to use Drizzle query builder instead of TypeORM SelectQueryBuilder.
 */

// biome-ignore lint/suspicious/noExplicitAny: TypeORM compat stub
export type SelectQueryBuilder<T> = any;
// biome-ignore lint/suspicious/noExplicitAny: TypeORM compat stub
export type ObjectLiteral = Record<string, any>;
export type FindOptionsSelect<T> = Partial<Record<keyof T, boolean>>;
// biome-ignore lint/suspicious/noExplicitAny: TypeORM compat stub
export type WhereExpressionBuilder = any;

// biome-ignore lint/suspicious/noExplicitAny: TypeORM compat stub
export const Equal = (value: any) => value;
// biome-ignore lint/suspicious/noExplicitAny: TypeORM compat stub
export const MoreThan = (value: any) => value;
// biome-ignore lint/suspicious/noExplicitAny: TypeORM compat stub
export const LessThan = (value: any) => value;
// biome-ignore lint/suspicious/noExplicitAny: TypeORM compat stub
export const MoreThanOrEqual = (value: any) => value;
// biome-ignore lint/suspicious/noExplicitAny: TypeORM compat stub
export const LessThanOrEqual = (value: any) => value;
// biome-ignore lint/suspicious/noExplicitAny: TypeORM compat stub
export const ILike = (value: any) => value;

export class Brackets {
  // biome-ignore lint/suspicious/noExplicitAny: TypeORM compat stub
  constructor(_cb: (qb: any) => void) {}
}
