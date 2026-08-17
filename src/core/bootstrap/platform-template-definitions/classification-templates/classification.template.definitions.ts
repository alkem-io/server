import { ClassificationTemplateDefinition } from './classification.template.definition';
import { bootstrapClassificationTemplateLanguage } from './classification.template.language';
import { bootstrapClassificationTemplateSDGs } from './classification.template.sdgs';
import { bootstrapClassificationTemplateSector } from './classification.template.sector';

export const bootstrapClassificationTemplateDefinitions: ClassificationTemplateDefinition[] =
  [
    bootstrapClassificationTemplateSDGs,
    bootstrapClassificationTemplateLanguage,
    bootstrapClassificationTemplateSector,
  ];
