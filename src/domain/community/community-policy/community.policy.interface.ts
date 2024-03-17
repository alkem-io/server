import { CommunityPolicyFlag } from '@common/enums/community.policy.flag';
import { ISpaceSettings } from '@domain/challenge/space.settings/space.settings.interface';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('CommunityPolicy')
export abstract class ICommunityPolicy extends IBaseAlkemio {
  member!: string;
  lead!: string;
  admin!: string;
  host!: string;
  flags!: Map<CommunityPolicyFlag, boolean>;
  settings!: ISpaceSettings;
}
