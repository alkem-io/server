import { LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { UserNotRegisteredException } from '@common/exceptions/registration.exception';
import { IAuthorizationRule } from '@core/authorization/rules';
import { IUser } from '@domain/community/user';

export class AuthorizationRuleSelfManagement implements IAuthorizationRule {
  userID?: number;
  userEmail?: string;
  profileID?: number;
  referenceID?: number;
  operation!: string;
  priority: number;

  constructor(fieldName: string, args: any, priority?: number) {
    this.operation = fieldName;
    this.priority = priority ?? 1000;

    if (fieldName === 'createUser') {
      this.userEmail = args.userData.email;
    } else if (fieldName === 'updateUser') {
      this.userID = args.userData.ID;
    } else if (fieldName === 'uploadAvatar') {
      this.profileID = args.uploadData.profileID;
    } else if (fieldName === 'updateProfile') {
      this.profileID = args.profileData.ID;
    } else if (fieldName === 'createReferenceOnProfile') {
      this.profileID = args.referenceInput.parentID;
    } else if (fieldName === 'createTagsetOnProfile') {
      this.profileID = args.tagsetData.parentID;
    } else if (fieldName === 'deleteReference') {
      this.referenceID = args.deleteData.ID;
    } else {
      // Failsafe: if decorator SelfManagement was used then one of the fieldNames must have matched
      throw new ForbiddenException(
        'User self-management not setup properly for requested access.',
        LogContext.AUTH
      );
    }
  }

  execute(user: IUser): boolean {
    // createUser mutation
    if (this.operation === 'createUser' && this.userEmail) {
      return true;
    }

    if (!user.profile)
      throw new UserNotRegisteredException(
        `Error: Unable to find user with given email: ${user.email}`
      );

    // updateUser mutation
    if (this.userID && this.userID == user.id) {
      return true;
    }
    // uploadAvatar, updateProfile, createReferenceOnProfile, createTagsetOnProfile mutations
    if (this.profileID && this.profileID == user.profile.id) {
      return true;
    }

    // deleteReference mutation
    if (this.referenceID) {
      if (!user.profile.references) return false;
      for (const reference of user.profile.references) {
        if (reference.id == this.referenceID) return true;
      }
    }
    return false;
  }
}
