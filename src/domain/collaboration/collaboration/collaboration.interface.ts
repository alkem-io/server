import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ITagsetTemplateSet } from '@domain/common/tagset-template-set';
import { ITimeline } from '@domain/timeline/timeline/timeline.interface';
import { IInnovationFlow } from '../innovation-flow/innovation.flow.interface';

@ObjectType('Collaboration')
export abstract class ICollaboration extends IAuthorizable {
  callouts?: ICallout[];

  tagsetTemplateSet?: ITagsetTemplateSet;

  timeline?: ITimeline;

  innovationFlow?: IInnovationFlow;

  groupsStr!: string;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Whether this Collaboration is a Template or not.',
  })
  isTemplate!: boolean;
}
