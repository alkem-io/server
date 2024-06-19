import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { Markdown } from '@domain/common/scalars/scalar.markdown';

@ObjectType('AiPersona')
export class IAiPersona extends IAuthorizable {
  //   Meta information:
  // - interactionModes: Q+R
  // - contextModes: full, summary, public profile, none

  aiPersonaServiceID!: string;

  @Field(() => Markdown, {
    nullable: false,
    description: 'The description for this AI Persona.',
  })
  description!: string;
}
