import { CalloutGroupName } from '@common/enums/callout.group.name';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CalloutGroup')
export abstract class ICalloutGroup {
  @Field(() => CalloutGroupName, {
    nullable: false,
    description: 'The display name for the Group',
  })
  displayName!: string;

  @Field(() => Markdown, {
    nullable: false,
    description: 'The explation text to clarify the Group.',
  })
  description!: string;
}
