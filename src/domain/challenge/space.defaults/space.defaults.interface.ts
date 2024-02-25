import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('SpaceDefaults')
export abstract class ISpaceDefaults extends IAuthorizable {
  challengeFlowStates!: string;

  opportunityFlowStates!: string;
}
