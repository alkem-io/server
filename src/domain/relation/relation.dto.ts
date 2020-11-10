import { InputType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class RelationInput {
  @Field({ nullable: true })
  @MaxLength(30)
  type!: string;

  @Field({ nullable: true })
  @MaxLength(100)
  actorName!: string;

  @Field({ nullable: true })
  @MaxLength(100)
  actorType!: string;

  @Field({ nullable: true })
  @MaxLength(100)
  actorRole!: string;

  @Field({ nullable: true })
  @MaxLength(400)
  description!: string;
}
