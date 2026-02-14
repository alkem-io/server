import { relations } from 'drizzle-orm';
import { licensePolicies } from './license.policy.schema';

export const licensePoliciesRelations = relations(licensePolicies, () => ({}));
