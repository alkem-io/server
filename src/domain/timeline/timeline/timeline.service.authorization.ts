import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ITimeline } from './timeline.interface';
import { Timeline } from './timeline.entity';
import { TimelineService } from './timeline.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CalendarAuthorizationService } from '../calendar/calendar.service.authorization';

@Injectable()
export class TimelineAuthorizationService {
  constructor(
    private calendarAuthorizationService: CalendarAuthorizationService,
    private timelineService: TimelineService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Timeline)
    private timelineRepository: Repository<Timeline>
  ) {}

  async applyAuthorizationPolicy(
    timelineInput: ITimeline,
    parentAuthorization: IAuthorizationPolicy | undefined,
    communityPolicy: ICommunityPolicy
  ): Promise<ITimeline> {
    const timeline = await this.timelineService.getTimelineOrFail(
      timelineInput.id,
      {
        relations: ['calendar'],
      }
    );

    timeline.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        timeline.authorization,
        parentAuthorization
      );

    // Cascade down
    const timelinePropagated = await this.propagateAuthorizationToChildEntities(
      timeline,
      communityPolicy
    );

    return await this.timelineRepository.save(timelinePropagated);
  }

  private async propagateAuthorizationToChildEntities(
    timeline: ITimeline,
    communityPolicy: ICommunityPolicy
  ): Promise<ITimeline> {
    if (timeline.calendar) {
      await this.calendarAuthorizationService.applyAuthorizationPolicy(
        timeline.calendar,
        timeline.authorization,
        communityPolicy
      );
    }

    return timeline;
  }
}
