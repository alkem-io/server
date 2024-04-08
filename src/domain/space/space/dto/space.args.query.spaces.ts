import { IDsQueryArgs } from '@domain/common/query-args/ids.query.args';
import { ArgsType, Field } from '@nestjs/graphql';
import { SpaceFilterInput } from '@services/infrastructure/space-filter/dto/space.filter.dto.input';

@ArgsType()
export class SpacesQueryArgs extends IDsQueryArgs {
  @Field(() => SpaceFilterInput, {
    nullable: true,
    description: 'Return Spaces matching the provided filter.',
  })
  filter!: SpaceFilterInput;
}
