import { Field, InputType } from '@nestjs/graphql';
import { VirtualPersonaType } from '@services/adapters/virtual-persona-adapter/virtual.persona.type';

@InputType()
export class VirtualPersonaInput {
  @Field(() => String, {
    nullable: false,
    description: 'The question that is being asked.',
  })
  question!: string;

  @Field(() => String, {
    nullable: false,
    description: 'Prompt.',
  })
  prompt!: string;

  @Field(() => VirtualPersonaType, {
    nullable: false,
    description: 'Virtual Persona Type.',
  })
  virtualPersonaType!: VirtualPersonaType;
}
