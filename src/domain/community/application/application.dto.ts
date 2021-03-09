import { NVPInput } from '@domain/common/nvp/nvp.dto';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { NVP } from '@domain/common/nvp/nvp.entity';

@InputType()
export class ApplicationInput {
  @Field()
  @IsOptional()
  userId!: number;

  @Field(() => [NVPInput])
  questions!: NVPInput[];
}

@ObjectType()
export class Question extends NVP {}
