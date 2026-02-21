import { CREDENTIAL_RULE_CALENDAR_EVENT_CREATED_BY } from '@common/constants/authorization/credential.rule.constants';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { RoomAuthorizationService } from '@domain/communication/room/room.service.authorization';
import { Injectable } from '@nestjs/common';
import { ICalendarEvent } from './event.interface';
import { CalendarEventService } from './event.service';

@Injectable()
export class CalendarEventAuthorizationService {
  constructor(
    private calendarEventService: CalendarEventService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private roomAuthorizationService: RoomAuthorizationService,
    private profileAuthorizationService: ProfileAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    calendarEventInput: ICalendarEvent,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const calendarEvent =
      await this.calendarEventService.getCalendarEventOrFail(
        calendarEventInput.id,
        {
          relations: { comments: true, profile: true },
        }
      );
    if (!calendarEvent.profile) {
      throw new RelationshipNotFoundException(
        `Unable to load entities on auth reset for calendar event ${calendarEvent.id} `,
        LogContext.CALENDAR
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    calendarEvent.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        calendarEvent.authorization,
        parentAuthorization
      );
    const clonedAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        calendarEvent.authorization
      );
    // Extend to give the user creating the calendarEvent more rights
    calendarEvent.authorization = this.appendCredentialRules(calendarEvent);
    updatedAuthorizations.push(calendarEvent.authorization);

    // Inherit for comments before extending so that the creating user does not
    // have rights to delete comments
    if (calendarEvent.comments) {
      const commentsAuthorization =
        await this.roomAuthorizationService.applyAuthorizationPolicy(
          calendarEvent.comments,
          clonedAuthorization
        );
      calendarEvent.comments.authorization =
        this.roomAuthorizationService.allowContributorsToCreateMessages(
          commentsAuthorization
        );
      calendarEvent.comments.authorization =
        this.roomAuthorizationService.allowContributorsToReplyReactToMessages(
          commentsAuthorization
        );
      updatedAuthorizations.push(commentsAuthorization);
    }

    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        calendarEvent.profile.id,
        calendarEvent.authorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

    return updatedAuthorizations;
  }

  private appendCredentialRules(
    calendarEvent: ICalendarEvent
  ): IAuthorizationPolicy {
    const authorization = calendarEvent.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for CalendarEvent: ${calendarEvent.id}`,
        LogContext.CALENDAR
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const manageCreatedCalendarEventPolicy =
      this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [
          {
            type: AuthorizationCredential.USER_SELF_MANAGEMENT,
            resourceID: calendarEvent.createdBy,
          },
        ],
        CREDENTIAL_RULE_CALENDAR_EVENT_CREATED_BY
      );
    newRules.push(manageCreatedCalendarEventPolicy);

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
