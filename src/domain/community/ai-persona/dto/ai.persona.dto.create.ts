import { HUGE_TEXT_LENGTH } from '@common/constants';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { CreateAiPersonaServiceInput } from '@services/ai-server/ai-persona-service/dto/ai.persona.service.dto.create';
import { MaxLength } from 'class-validator';

@InputType()
export class CreateAiPersonaInput {
  @Field(() => Markdown, { nullable: false })
  @MaxLength(HUGE_TEXT_LENGTH)
  description!: string;

  @Field(() => UUID, { nullable: true })
  aiPersonaServiceID?: string;

  @Field(() => CreateAiPersonaServiceInput, { nullable: true })
  aiPersonService?: CreateAiPersonaServiceInput;
}
