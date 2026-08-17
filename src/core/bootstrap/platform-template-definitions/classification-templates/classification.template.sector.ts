import { ClassificationCardinality } from '@common/enums/classification.cardinality';
import { ClassificationTemplateDefinition } from './classification.template.definition';

export const bootstrapClassificationTemplateSector: ClassificationTemplateDefinition =
  {
    nameID: 'sector',
    displayName: 'Sector',
    description: 'The primary sector this Space operates in.',
    cardinality: ClassificationCardinality.SINGLE_SELECT,
    values: [
      { id: 'health', label: 'Health' },
      { id: 'education', label: 'Education' },
      { id: 'environment', label: 'Environment' },
      { id: 'technology', label: 'Technology' },
      { id: 'finance', label: 'Finance' },
      { id: 'agriculture', label: 'Agriculture' },
      { id: 'energy', label: 'Energy' },
      { id: 'other', label: 'Other' },
    ],
  };
