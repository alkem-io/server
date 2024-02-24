import { ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { IProfile } from '@domain/common/profile/profile.interface';

@ObjectType('InnovationFlow')
export abstract class IInnovationFlow extends IAuthorizable {
  profile!: IProfile;

  // Needed to be able to validate that the provided innovation flow template is from the containing space
  spaceID!: string;

  states!: string;
}
