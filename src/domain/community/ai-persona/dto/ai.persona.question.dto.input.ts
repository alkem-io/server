import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AiPersonaQuestionInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'Virtual Persona Type.',
  })
  aiPersonaID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The question that is being asked.',
  })
  question!: string;
}