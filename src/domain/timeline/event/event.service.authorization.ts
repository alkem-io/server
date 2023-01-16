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
import { CommentsAuthorizationService } from '@domain/communication/comments/comments.service.authorization';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CommunityPolicyService } from '@domain/community/community-policy/community.policy.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { CardProfileAuthorizationService } from '@domain/collaboration/card-profile/card.profile.service.authorization';

@Injectable()
export class CalendarEventAuthorizationService {
  constructor(
    private calendarEventService: CalendarEventService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private commentsAuthorizationService: CommentsAuthorizationService,
    private communityPolicyService: CommunityPolicyService,
    private cardProfileAuthorizationService: CardProfileAuthorizationService,
    @InjectRepository(CalendarEvent)
    private calendarEventRepository: Repository<CalendarEvent>
  ) {}

  async applyAuthorizationPolicy(
    calendarEvent: ICalendarEvent,
    parentAuthorization: IAuthorizationPolicy | undefined,
    communityPolicy: ICommunityPolicy
  ): Promise<ICalendarEvent> {
    calendarEvent.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        calendarEvent.authorization,
        parentAuthorization
      );

    // Inherit for comments before extending so that the creating user does not
    // have rights to delete comments
    if (calendarEvent.comments) {
      calendarEvent.comments =
        await this.commentsAuthorizationService.applyAuthorizationPolicy(
          calendarEvent.comments,
          calendarEvent.authorization
        );
    }

    // Extend to give the user creating the calendarEvent more rights
    calendarEvent.authorization = this.appendCredentialRules(
      calendarEvent,
      communityPolicy
    );

    calendarEvent.profile = await this.calendarEventService.getCardProfile(
      calendarEvent
    );
    calendarEvent.profile =
      await this.cardProfileAuthorizationService.applyAuthorizationPolicy(
        calendarEvent.profile,
        calendarEvent.authorization
      );

    return await this.calendarEventRepository.save(calendarEvent);
  }

  private appendCredentialRules(
    calendarEvent: ICalendarEvent,
    communityPolicy: ICommunityPolicy
  ): IAuthorizationPolicy {
    const authorization = calendarEvent.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for CalendarEvent: ${calendarEvent.id}`,
        LogContext.COLLABORATION
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
        ]
      );
    newRules.push(manageCreatedCalendarEventPolicy);

    // Allow hub admins to move card
    const credentials =
      this.communityPolicyService.getAdminCredentials(communityPolicy);
    credentials.push({
      type: AuthorizationCredential.GLOBAL_ADMIN,
      resourceID: '',
    });
    credentials.push({
      type: AuthorizationCredential.GLOBAL_ADMIN_HUBS,
      resourceID: '',
    });
    const adminsMoveCardRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.MOVE_CARD],
        credentials
      );
    adminsMoveCardRule.inheritable = false;
    newRules.push(adminsMoveCardRule);

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
