import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { ICalendarEvent } from './event.interface';
import { CalendarEvent } from './event.entity';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { CalendarEventService } from './event.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { CREDENTIAL_RULE_CALENDAR_EVENT_CREATED_BY } from '@common/constants/authorization/credential.rule.constants';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { RoomAuthorizationService } from '@domain/communication/room2/room.service.authorization';

@Injectable()
export class CalendarEventAuthorizationService {
  constructor(
    private calendarEventService: CalendarEventService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private roomAuthorizationService: RoomAuthorizationService,
    private profileAuthorizationService: ProfileAuthorizationService,
    @InjectRepository(CalendarEvent)
    private calendarEventRepository: Repository<CalendarEvent>
  ) {}

  async applyAuthorizationPolicy(
    calendarEventInput: ICalendarEvent,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ICalendarEvent> {
    const calendarEvent =
      await this.calendarEventService.getCalendarEventOrFail(
        calendarEventInput.id,
        {
          relations: ['comments', 'profile'],
        }
      );
    calendarEvent.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        calendarEvent.authorization,
        parentAuthorization
      );

    // Inherit for comments before extending so that the creating user does not
    // have rights to delete comments
    if (calendarEvent.comments) {
      calendarEvent.comments =
        await this.roomAuthorizationService.applyAuthorizationPolicy(
          calendarEvent.comments,
          calendarEvent.authorization
        );
    }

    // Extend to give the user creating the calendarEvent more rights
    calendarEvent.authorization = this.appendCredentialRules(calendarEvent);

    if (calendarEvent.profile) {
      calendarEvent.profile =
        await this.profileAuthorizationService.applyAuthorizationPolicy(
          calendarEvent.profile,
          calendarEvent.authorization
        );
    }

    return await this.calendarEventRepository.save(calendarEvent);
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
