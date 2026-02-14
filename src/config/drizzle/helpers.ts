import { and, eq, type InferInsertModel, type Table } from 'drizzle-orm';
import type { PgTable, TableConfig } from 'drizzle-orm/pg-core';
import type { DrizzleDb } from './drizzle.constants';

/**
 * Optimistic locking update helper.
 * Replaces TypeORM's automatic @VersionColumn behavior.
 *
 * Increments the version column and uses a WHERE clause to ensure
 * no concurrent modification has occurred. Throws if zero rows updated.
 */
export async function updateWithVersion<T extends PgTable<TableConfig>>(
  db: DrizzleDb,
  table: T,
  id: string,
  currentVersion: number,
  data: Partial<InferInsertModel<T>>
): Promise<InferInsertModel<T>> {
  const idCol = (table as any).id;
  const versionCol = (table as any).version;

  const result = await db
    .update(table)
    .set({ ...data, version: currentVersion + 1 } as any)
    .where(and(eq(idCol, id), eq(versionCol, currentVersion)))
    .returning();

  if (result.length === 0) {
    throw new Error(
      'Optimistic lock failure: the entity was modified by another transaction'
    );
  }

  return result[0] as InferInsertModel<T>;
}

/**
 * Standard eager-loading replacement configurations.
 * Use these with Drizzle's relational query `with:` clause
 * to replace TypeORM's `eager: true` behavior.
 */
export const withAuthorization = { authorization: true } as const;
export const withProfile = { profile: true } as const;
export const withAgent = { agent: true } as const;
