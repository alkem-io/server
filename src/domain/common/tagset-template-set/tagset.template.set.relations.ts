import { relations } from 'drizzle-orm';
import { tagsetTemplateSets } from './tagset.template.set.schema';
import { tagsetTemplates } from '@domain/common/tagset-template/tagset.template.schema';

export const tagsetTemplateSetsRelations = relations(
  tagsetTemplateSets,
  ({ many }) => ({
    // OneToMany: TagsetTemplates
    tagsetTemplates: many(tagsetTemplates),
  })
);
