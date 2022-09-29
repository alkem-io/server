import { ArgsType, Field } from '@nestjs/graphql';
import { HubFilterInput } from '@services/domain/hub-filter/dto/hub.filter.dto.input';

@ArgsType()
export class HubsQueryArgs {
  @Field(() => HubFilterInput, {
    nullable: true,
    description: 'Return Hubs matching the provided filter.',
  })
  filter!: HubFilterInput;
}
