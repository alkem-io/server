import { SpaceLevel } from '@common/enums/space.level';
import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { UrlResolverQueryResultCollaboration } from './url.resolver.query.collaboration.result';

@ObjectType()
export class UrlResolverQueryResultSpace {
  @Field(() => UUID, {
    nullable: false,
  })
  id!: string;

  @Field(() => SpaceLevel, {
    nullable: false,
  })
  level!: SpaceLevel;

  @Field(() => [UUID], {
    nullable: false,
  })
  parentSpaces!: string[];

  @Field(() => UUID, {
    nullable: false,
  })
  levelZeroSpaceID!: string;

  @Field(() => UrlResolverQueryResultCollaboration, {
    nullable: false,
  })
  collaboration!: UrlResolverQueryResultCollaboration;

  internalPath?: string;
}
