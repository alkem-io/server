import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');

export type DrizzleDb = PostgresJsDatabase<typeof schema>;
