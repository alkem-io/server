import { CreateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create';
import { UUID_NAMEID } from '@domain/common/scalars';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateProjectInput extends CreateNameableInput {
  @Field(() => UUID_NAMEID, { nullable: false })
  opportunityID!: string;
}
