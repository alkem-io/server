import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UrlResolverQueryResultTemplatesSet {
  @Field(() => UUID, {
    nullable: false,
  })
  id!: string;

  @Field(() => UUID, {
    nullable: true,
  })
  templateId?: string;
}
