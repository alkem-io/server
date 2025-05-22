import { AiPersonaModelCardEntry } from '@common/enums/ai.persona.model.card.entry';
import { Field, ObjectType } from '@nestjs/graphql';
import { AiPersonaModelCardEntryFlag } from './ai.persona.model.card.dto.entry.flag';

@ObjectType()
export class ModelCardSpaceUsageResult {
  @Field(() => AiPersonaModelCardEntry, {
    description: 'The Model Card Entry type.',
  })
  modelCardEntry!: AiPersonaModelCardEntry;

  @Field(() => [AiPersonaModelCardEntryFlag], {
    nullable: false,
    description: 'The Flags for this Model Card Entry.',
  })
  flags?: AiPersonaModelCardEntryFlag[];
}
