import { DeleteBaseCherrytwistInput } from '@domain/common/entity/base-entity';
import { UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DeleteOrganisationInput extends DeleteBaseCherrytwistInput {
  @Field(() => UUID_NAMEID, { nullable: false })
  ID!: string;
}
