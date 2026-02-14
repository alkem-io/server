import { relations } from 'drizzle-orm';
import { activities } from './activity.schema';

export const activitiesRelations = relations(activities, () => ({}));
