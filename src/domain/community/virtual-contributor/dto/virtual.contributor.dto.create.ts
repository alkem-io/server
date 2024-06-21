import { Field, InputType } from '@nestjs/graphql';
import { CreateContributorInput } from '@domain/community/contributor/dto/contributor.dto.create';
import { CreateAiPersonaInput } from '@domain/community/ai-persona/dto/ai.persona.dto.create';

@InputType()
export class CreateVirtualContributorInput extends CreateContributorInput {
  @Field(() => CreateAiPersonaInput, {
    nullable: false,
    description: 'Data used to create the AI Persona',
  })
  aiPersona!: CreateAiPersonaInput;
}
