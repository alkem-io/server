import { UUID_NAMEID, UUID } from '@domain/common/scalars';
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

  @Field(() => UUID_NAMEID, {
    description: 'The Space in which the question to the VC is aked',
    nullable: false,
  })
  spaceID!: string;

  @Field(() => UUID, {
    nullable: false,
    description: 'The Room in the context of which the VC is asked',
  })
  roomID!: string;
}
