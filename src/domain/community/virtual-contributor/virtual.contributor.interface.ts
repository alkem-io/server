import { Field, ObjectType } from '@nestjs/graphql';
import { IContributor } from '../contributor/contributor.interface';
import { VirtualPersonaType } from '@services/adapters/virtual-persona-adapter/virtual.persona.type';

@ObjectType('VirtualContributor')
export class IVirtualContributor extends IContributor {
  @Field(() => String, {
    nullable: true,
    description: 'The prompt being used by this Virtual',
  })
  prompt!: string;

  @Field(() => VirtualPersonaType, {
    description: 'The VirtualContributor Persona type',
  })
  type!: VirtualPersonaType;
}
