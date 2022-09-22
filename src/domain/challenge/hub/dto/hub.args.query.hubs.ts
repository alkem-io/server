import { ArgsType, Field } from '@nestjs/graphql';
import { HubVisibility } from '@common/enums/hub.visibility';

@ArgsType()
export class HubsQueryInput {
  @Field(() => [HubVisibility], {
    nullable: true,
    description:
      'Return Hubs with a Visibility matching one of the provided types.',
  })
  visibilities!: HubVisibility[];
}
