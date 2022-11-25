import { CommunityPolicyFlag } from '@common/enums/community.policy.flag';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('CommunityPolicy')
export abstract class ICommunityPolicy extends IBaseAlkemio {
  member!: string;
  lead!: string;
  flags!: Map<CommunityPolicyFlag, boolean>;
}
