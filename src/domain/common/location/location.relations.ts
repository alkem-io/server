import { relations } from 'drizzle-orm';
import { locations } from './location.schema';

/**
 * Location is a leaf entity with no outgoing relations.
 * It is referenced by Profile via profileId -> locationId FK.
 */
export const locationsRelations = relations(locations, () => ({}));
