import { relations } from 'drizzle-orm';
import { nvps } from './nvp.schema';

/**
 * NVP is a leaf entity with no outgoing relations.
 */
export const nvpsRelations = relations(nvps, () => ({}));
