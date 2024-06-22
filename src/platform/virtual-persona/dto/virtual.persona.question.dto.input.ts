import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class VirtualPersonaQuestionInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'Virtual Persona Type.',
  })
  virtualPersonaID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The question that is being asked.',
  })
  question!: string;
}
