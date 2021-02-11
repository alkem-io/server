import { NVPInput } from '@domain/nvp/nvp.dto';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { NVP } from '@domain/nvp/nvp.entity';

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
