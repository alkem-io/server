import { UUID, UUID_NAMEID } from '@domain/common/scalars';
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
