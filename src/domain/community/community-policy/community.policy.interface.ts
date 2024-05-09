import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('CommunityPolicy')
export abstract class ICommunityPolicy extends IBaseAlkemio {
  member!: string;
  lead!: string;
  admin!: string;
  settings!: ISpaceSettings;
}
