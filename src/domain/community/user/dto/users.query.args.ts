import { UUID } from '@domain/common/scalars/scalar.uuid';
import { ContributorQueryArgs } from '@domain/community/contributor/dto/contributor.query.args';
import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class UsersQueryArgs extends ContributorQueryArgs {
  @Field(() => [UUID], {
    description: 'Retrieve the specified users by ID.',
    nullable: true,
  })
  IDs?: string[];
}
