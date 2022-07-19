import { ObjectType, Field } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IRelation } from '../relation/relation.interface';
import { ICallout } from '../callout';

@ObjectType('Collaboration')
export abstract class ICollaboration extends IAuthorizable {
  @Field(() => [ICallout], {
    nullable: true,
    description: 'List of aspects',
  })
  aspectCallouts?: ICallout[];

  @Field(() => [ICallout], {
    nullable: true,
    description: 'List of aspects',
  })
  canvasCallouts?: ICallout[];

  @Field(() => [IRelation], {
    nullable: true,
    description: 'List of relations',
  })
  relations?: IRelation[];
}
