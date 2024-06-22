import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity';

@InputType()
export class UpdateVirtualContributorPlatformSettingsInput extends UpdateBaseAlkemioInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'An Account ID associated with the VirtualContributor',
  })
  accountID!: string;
}
