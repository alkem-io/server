import { relations } from 'drizzle-orm';
import { lifecycles } from './lifecycle.schema';

/**
 * Lifecycle is a leaf entity with no outgoing relations.
 */
export const lifecyclesRelations = relations(lifecycles, () => ({}));
