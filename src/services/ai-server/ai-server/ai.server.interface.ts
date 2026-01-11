import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ObjectType, Field } from '@nestjs/graphql';
import { IAiPersona } from '@services/ai-server/ai-persona';

@ObjectType('AiServer')
export abstract class IAiServer extends IAuthorizable {
  @Field(() => [IAiPersona], {
    nullable: false,
    description: 'The AI Personas hosted by this AI Server.',
  })
  aiPersonas?: IAiPersona[];

  defaultAiPersona?: IAiPersona;
}
