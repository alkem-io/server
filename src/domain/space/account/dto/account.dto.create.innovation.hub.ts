import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CreateInnovationHubInput } from '@domain/innovation-hub/dto';

@InputType()
export class CreateInnovationHubOnAccountInput extends CreateInnovationHubInput {
  @Field(() => UUID, { nullable: false })
  accountID!: string;
}
