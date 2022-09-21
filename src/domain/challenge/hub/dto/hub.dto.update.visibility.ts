import { HubVisibility } from '@common/enums/hub.visibility';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateHubVisibilityInput {
  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Hub whose visibility is to be updated.',
  })
  hubID!: string;

  @Field(() => HubVisibility, {
    nullable: false,
    description: 'Visibility of the Hub.',
  })
  visibility!: HubVisibility;
}
