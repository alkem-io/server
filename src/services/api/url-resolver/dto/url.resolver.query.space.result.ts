import { SpaceLevel } from '@common/enums/space.level';
import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { UrlResolverQueryResultCalendar } from './url.resolver.query.calendar.result';
import { UrlResolverQueryResultCollaboration } from './url.resolver.query.collaboration.result';
import { UrlResolverQueryResultTemplatesSet } from './url.resolver.query.templates.set.result';

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

  @Field(() => UrlResolverQueryResultTemplatesSet, {
    nullable: true,
  })
  templatesSet?: UrlResolverQueryResultTemplatesSet;

  @Field(() => UrlResolverQueryResultCalendar, {
    nullable: true,
  })
  calendar?: UrlResolverQueryResultCalendar;

  internalPath?: string;
}
