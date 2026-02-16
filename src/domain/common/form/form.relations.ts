import { relations } from 'drizzle-orm';
import { forms } from './form.schema';

/**
 * Form is a leaf entity with no outgoing relations.
 */
export const formsRelations = relations(forms, () => ({}));
