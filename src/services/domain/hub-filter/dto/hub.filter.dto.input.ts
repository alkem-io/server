import { Field, InputType } from '@nestjs/graphql';
import { HubVisibility } from '@common/enums/hub.visibility';

@InputType()
export class HubFilterInput {
  @Field(() => [HubVisibility], {
    nullable: true,
    description:
      'Return Hubs with a Visibility matching one of the provided types.',
  })
  visibilities!: HubVisibility[];
}
