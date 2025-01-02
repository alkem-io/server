import { Field, InputType } from '@nestjs/graphql';
import { CreateContributorInput } from '@domain/community/contributor/dto/contributor.dto.create';
import { CreateAiPersonaInput } from '@domain/community/ai-persona/dto/ai.persona.dto.create';
import { CreateKnowledgeBaseInput } from '@domain/common/knowledge-base/dto';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class CreateVirtualContributorInput extends CreateContributorInput {
  @Field(() => CreateAiPersonaInput, {
    nullable: false,
    description: 'Data used to create the AI Persona',
  })
  aiPersona!: CreateAiPersonaInput;

  @Field(() => CreateKnowledgeBaseInput, {
    nullable: true,
    description: 'The KnowledgeBase to use for this Collaboration.',
  })
  @ValidateNested()
  @IsOptional()
  @Type(() => CreateKnowledgeBaseInput)
  knowledgeBaseData!: CreateKnowledgeBaseInput;
}
