import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { IAiPersonaService } from '@services/ai-server/ai-persona-service';

@ObjectType('AiPersona')
export class IAiPersona extends IAuthorizable {
  //   Meta information:
  // - interactionModes: Q+R
  // - contextModes: full, summary, public profile, none

  @Field(() => IAiPersonaService, {
    nullable: false,
    description: 'The AI Persona Service being used by this AI Persona.',
  })
  aiPersonaService!: IAiPersonaService;

  @Field(() => Markdown, {
    nullable: false,
    description: 'The description for this AI Persona.',
  })
  description!: string;
}
