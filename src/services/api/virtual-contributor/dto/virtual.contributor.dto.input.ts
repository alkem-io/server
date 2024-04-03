import { Field, InputType } from '@nestjs/graphql';
import { VirtualContributorType } from '@services/adapters/virtual-contributor-adapter/virtual.contributor.type';

@InputType()
export class VirtualContributorInput {
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

  @Field(() => VirtualContributorType, {
    nullable: false,
    description: 'Virtual Contributor Type.',
  })
  virtualContributorType!: VirtualContributorType;
}
