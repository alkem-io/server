import { ObjectType, Field } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ITagsetTemplateSet } from '@domain/common/tagset-template-set';

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
}
