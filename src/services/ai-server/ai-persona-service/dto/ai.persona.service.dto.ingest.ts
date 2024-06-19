import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { UUID_LENGTH } from '@src/common/constants';
import { UUID } from '@domain/common/scalars';

@InputType()
export class AiPersonaIngestInput {
  @Field(() => UUID, { nullable: false })
  @MaxLength(UUID_LENGTH)
  aiPersonaServiceID!: string;
}
