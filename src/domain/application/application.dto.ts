import { NVPInput } from '@domain/nvp/nvp.dto';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@InputType()
export class ApplicationInput {
  @Field()
  @IsOptional()
  userId!: number;

  @Field(() => [NVPInput])
  questions!: NVPInput[];
}
