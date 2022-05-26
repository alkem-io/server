import { UUID } from '@domain/common/scalars/scalar.uuid';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteTemplateBaseInput {
  @Field(() => UUID, { nullable: false })
  templatesSetID!: string;
}
