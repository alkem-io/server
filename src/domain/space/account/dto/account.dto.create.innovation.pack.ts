import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CreateInnovationPackInput } from '@library/innovation-pack/dto/innovation.pack.dto.create';

@InputType()
export class CreateInnovationPackOnAccountInput extends CreateInnovationPackInput {
  @Field(() => UUID, { nullable: false })
  accountID!: string;
}
