import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@InputType('DeleteCalloutFormResponseInput')
export class DeleteCalloutFormResponseInput {
  @Field(() => UUID, { nullable: false })
  @IsUUID()
  responseID!: string;
}
