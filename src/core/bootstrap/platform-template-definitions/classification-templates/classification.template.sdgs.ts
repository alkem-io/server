import { ClassificationCardinality } from '@common/enums/classification.cardinality';
import { ClassificationTemplateDefinition } from './classification.template.definition';

// The UN Sustainable Development Goals, authored order (never re-sorted).
export const bootstrapClassificationTemplateSDGs: ClassificationTemplateDefinition =
  {
    nameID: 'sdgs',
    displayName: 'SDGs',
    description: 'The UN Sustainable Development Goals.',
    cardinality: ClassificationCardinality.MULTI_SELECT,
    values: [
      { id: 'sdg-1', label: '1 · No Poverty' },
      { id: 'sdg-2', label: '2 · Zero Hunger' },
      { id: 'sdg-3', label: '3 · Good Health and Well-being' },
      { id: 'sdg-4', label: '4 · Quality Education' },
      { id: 'sdg-5', label: '5 · Gender Equality' },
      { id: 'sdg-6', label: '6 · Clean Water and Sanitation' },
      { id: 'sdg-7', label: '7 · Affordable and Clean Energy' },
      { id: 'sdg-8', label: '8 · Decent Work and Economic Growth' },
      { id: 'sdg-9', label: '9 · Industry, Innovation and Infrastructure' },
      { id: 'sdg-10', label: '10 · Reduced Inequalities' },
      { id: 'sdg-11', label: '11 · Sustainable Cities and Communities' },
      {
        id: 'sdg-12',
        label: '12 · Responsible Consumption and Production',
      },
      { id: 'sdg-13', label: '13 · Climate Action' },
      { id: 'sdg-14', label: '14 · Life Below Water' },
      { id: 'sdg-15', label: '15 · Life on Land' },
      {
        id: 'sdg-16',
        label: '16 · Peace, Justice and Strong Institutions',
      },
      { id: 'sdg-17', label: '17 · Partnerships for the Goals' },
    ],
  };
