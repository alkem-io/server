import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class VirtualContributorAuthorizationResetInput {
  @Field(() => UUID, {
    nullable: false,
    description:
      'The identifier of the Virtual Contributor whose Authorization Policy should be reset.',
  })
  virtualContributorID!: string;
}
