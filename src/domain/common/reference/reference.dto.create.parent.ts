import { InputType, Field } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { UUID } from '../scalars/scalar.uuid';
import { CreateReferenceInput } from './reference.dto.create';

@InputType()
export class CreateReferenceParentInput extends CreateReferenceInput {
  @Field(() => UUID, { nullable: true })
  @IsOptional()
  parentID!: string;
}
