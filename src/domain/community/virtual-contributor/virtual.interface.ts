import { Field, ObjectType } from '@nestjs/graphql';
import { IContributor } from '../contributor/contributor.interface';
import { VirtualContributorType } from '@services/adapters/virtual-contributor-adapter/virtual.contributor.type';

@ObjectType('Virtual')
export class IVirtual extends IContributor {
  @Field(() => String, {
    nullable: true,
    description: 'The prompt being used by this Virtual',
  })
  prompt!: string;

  @Field(() => VirtualContributorType, {
    description: 'The VirtualContributor type',
  })
  type!: VirtualContributorType;
}
