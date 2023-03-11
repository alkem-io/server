import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('ITemplateBase')
export abstract class ITemplateBase extends IAuthorizable {
  profile!: IProfile;
}
