import { Field, ObjectType } from '@nestjs/graphql';
import { IContributorBase } from '../contributor/contributor.base.interface';
import { IAccount } from '@domain/space/account/account.interface';
import { IContributor } from '../contributor/contributor.interface';
import { SearchVisibility } from '@common/enums/search.visibility';
import { IAiPersona } from '../ai-persona';

@ObjectType('VirtualContributor', {
  implements: () => [IContributor],
})
export class IVirtualContributor
  extends IContributorBase
  implements IContributor
{
  @Field(() => IAiPersona, {
    description: 'The AI persona being used by this virtual contributor',
  })
  aiPersona!: IAiPersona;

  communicationID!: string;
  @Field(() => IAccount, {
    nullable: true,
    description: 'The account under which the virtual contributor was created',
  })
  account!: IAccount;

  @Field(() => SearchVisibility, {
    description: 'Visibility of the VC in searches.',
    nullable: false,
  })
  searchVisibility!: SearchVisibility;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Flag to control if this VC is listed in the platform store.',
  })
  listedInStore!: boolean;
}
