import { Field, InputType } from '@nestjs/graphql';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create';
import { IsOptional } from 'class-validator';

@InputType()
export class CreateInnovationPackInput extends CreateNameableInput {
  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
