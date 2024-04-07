import { Field, ObjectType } from '@nestjs/graphql';
import { IContributor } from '../contributor/contributor.interface';
import { IVirtualPersona } from '../virtual-persona';

@ObjectType('VirtualContributor')
export class IVirtualContributor extends IContributor {
  @Field(() => IVirtualPersona, {
    description: 'The virtual persona being used by this virtual contributor',
  })
  virtualPersona!: IVirtualPersona;
}
