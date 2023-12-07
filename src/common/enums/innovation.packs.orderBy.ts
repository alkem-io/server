import { registerEnumType } from '@nestjs/graphql';

export enum InnovationPacksOrderBy {
  RANDOM = 'random',
  NUMBER_OF_TEMPLATES_ASC = 'innovationPacks.numberOfTemplates_ASC',
  NUMBER_OF_TEMPLATES_DESC = 'innovationPacks.numberOfTemplates_DESC',
}

registerEnumType(InnovationPacksOrderBy, {
  name: 'InnovationPacksOrderBy',
});
