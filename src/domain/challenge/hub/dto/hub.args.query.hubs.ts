import { ArgsType, Field } from '@nestjs/graphql';
import { HubsFilterInput } from '@services/domain/hub-filter/dto/hub.filter.dto.input';

@ArgsType()
export class HubsQueryArgs {
  @Field(() => HubsFilterInput, {
    nullable: true,
    description: 'Return Hubs matching the provided filter.',
  })
  filter!: HubsFilterInput;
}
