import { IDsQueryArgs } from '@domain/common/query-args/ids.query.args';
import { ArgsType, Field } from '@nestjs/graphql';
import { HubFilterInput } from '@services/infrastructure/hub-filter/dto/hub.filter.dto.input';

@ArgsType()
export class HubsQueryArgs extends IDsQueryArgs {
  @Field(() => HubFilterInput, {
    nullable: true,
    description: 'Return Hubs matching the provided filter.',
  })
  filter!: HubFilterInput;
}
