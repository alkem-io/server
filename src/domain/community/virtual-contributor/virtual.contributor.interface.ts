import { Field, ObjectType } from '@nestjs/graphql';
import { IContributorBase } from '../contributor/contributor.base.interface';
import { IVirtualPersona } from '../virtual-persona';
import { IContributor } from '../contributor/contributor.interface';

@ObjectType('VirtualContributor', {
  implements: () => [IContributor],
})
export class IVirtualContributor
  extends IContributorBase
  implements IContributor
{
  @Field(() => IVirtualPersona, {
    description: 'The virtual persona being used by this virtual contributor',
  })
  virtualPersona!: IVirtualPersona;
  communicationID!: string;
}
