import { ObjectType, Field } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ITagsetTemplateSet } from '@domain/common/tagset-template-set';
import { ITimeline } from '@domain/timeline/timeline/timeline.interface';
import { IInnovationFlow } from '../innovation-flow/innovation.flow.interface';

@ObjectType('Collaboration')
export abstract class ICollaboration extends IAuthorizable {
  @Field(() => [ICallout], {
    nullable: true,
    description: 'List of callouts',
  })
  callouts?: ICallout[];

  @Field(() => [IRelation], {
    nullable: true,
    description: 'List of relations',
  })
  relations?: IRelation[];

  tagsetTemplateSet?: ITagsetTemplateSet;

  timeline?: ITimeline;

  innovationFlow?: IInnovationFlow;

  groupsStr!: string;
}
