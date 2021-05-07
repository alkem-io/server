import { LogContext } from '@common/enums';
import {
  EntityNotInitializedException,
  ForbiddenException,
} from '@common/exceptions';
import { IAuthorizationRule } from '@core/authorization/rules';
import { IUser } from '@domain/community/user';

export class AuthorizationRuleSelfManagement implements IAuthorizationRule {
  userID?: number;
  userEmail?: string;
  profileID?: number;
  referenceID?: number;

  constructor(fieldName: string, args: any) {
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

  evaluate(user: IUser): boolean {
    if (!user.profile)
      throw new EntityNotInitializedException(
        `User Profile not initialized: ${user.email}`,
        LogContext.AUTH
      );
    // createUser mutation
    if (
      this.userEmail &&
      this.userEmail.toLowerCase() === user.email.toLowerCase()
    ) {
      return true;
    }
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
