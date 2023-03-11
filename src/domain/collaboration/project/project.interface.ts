import { IAgreement } from '@domain/collaboration/agreement/agreement.interface';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { INameable } from '@domain/common/entity/nameable-entity/nameable.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('Project')
export abstract class IProject extends INameable {
  profile!: IProfile;

  lifecycle?: ILifecycle;

  agreements?: IAgreement[];

  hubID!: string;
}
