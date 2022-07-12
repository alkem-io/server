import { IAspect } from '@domain/collaboration/aspect/aspect.interface';
import { ObjectType, Field } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IRelation } from '../relation/relation.interface';

@ObjectType('Collaboration')
export abstract class ICollaboration extends IAuthorizable {
  @Field(() => [IAspect], {
    nullable: true,
    description: 'List of aspects',
  })
  aspects?: IAspect[];

  @Field(() => [IRelation], {
    nullable: true,
    description: 'List of relations',
  })
  relations?: IRelation[];
}
