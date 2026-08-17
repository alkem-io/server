import { ClassificationCardinality } from '@common/enums/classification.cardinality';
import { ClassificationTemplateDefinition } from './classification.template.definition';

export const bootstrapClassificationTemplateLanguage: ClassificationTemplateDefinition =
  {
    nameID: 'language',
    displayName: 'Language',
    description: 'The primary working language(s) of this Space.',
    cardinality: ClassificationCardinality.MULTI_SELECT,
    values: [
      { id: 'en', label: 'English' },
      { id: 'nl', label: 'Dutch' },
      { id: 'fr', label: 'French' },
      { id: 'de', label: 'German' },
      { id: 'es', label: 'Spanish' },
    ],
  };
