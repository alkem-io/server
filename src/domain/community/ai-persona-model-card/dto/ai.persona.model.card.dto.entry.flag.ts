import { AiPersonaModelCardEntryFlagName } from '@common/enums/ai.persona.model.card.entry.flag.name';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('AiPersonaModelCardFlag')
export class AiPersonaModelCardEntryFlag {
  @Field(() => AiPersonaModelCardEntryFlagName, {
    description: 'The name of the Model Card Entry flag',
    nullable: false,
  })
  name!: AiPersonaModelCardEntryFlagName;

  @Field(() => Boolean, {
    description: 'Is this model card entry flag enabled?',
    nullable: false,
  })
  enabled!: boolean;
}
