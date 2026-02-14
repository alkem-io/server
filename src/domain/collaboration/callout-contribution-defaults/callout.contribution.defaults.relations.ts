import { relations } from 'drizzle-orm';
import { calloutContributionDefaults } from './callout.contribution.defaults.schema';

export const calloutContributionDefaultsRelations = relations(
  calloutContributionDefaults,
  () => ({
    // No relations defined - this entity has no TypeORM relations
  })
);
