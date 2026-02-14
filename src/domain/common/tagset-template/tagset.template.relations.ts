import { relations } from 'drizzle-orm';
import { tagsetTemplates } from './tagset.template.schema';
import { tagsetTemplateSets } from '@domain/common/tagset-template-set/tagset.template.set.schema';
import { tagsets } from '@domain/common/tagset/tagset.schema';

export const tagsetTemplatesRelations = relations(
  tagsetTemplates,
  ({ one, many }) => ({
    // ManyToOne: TagsetTemplateSet
    tagsetTemplateSet: one(tagsetTemplateSets, {
      fields: [tagsetTemplates.tagsetTemplateSetId],
      references: [tagsetTemplateSets.id],
    }),

    // OneToMany: Tagsets referencing this template
    tagsets: many(tagsets),
  })
);
