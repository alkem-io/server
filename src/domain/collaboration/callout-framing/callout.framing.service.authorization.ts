import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { CalloutFramingService } from './callout.framing.service';
import { CalloutFraming } from './callout.framing.entity';
import { ICalloutFraming } from './callout.framing.interface';
import { WhiteboardAuthorizationService } from '@domain/common/whiteboard/whiteboard.service.authorization';
import { WhiteboardRtAuthorizationService } from '@domain/common/whiteboard-rt/whiteboard.rt.authorization.service';

@Injectable()
export class CalloutFramingAuthorizationService {
  constructor(
    private calloutFramingService: CalloutFramingService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private whiteboardAuthorizationService: WhiteboardAuthorizationService,
    private whiteboardRtAuthorizationService: WhiteboardRtAuthorizationService,
    @InjectRepository(CalloutFraming)
    private calloutFramingRepository: Repository<CalloutFraming>
  ) {}

  public async applyAuthorizationPolicy(
    calloutFraming: ICalloutFraming,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ICalloutFraming> {
    calloutFraming.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        calloutFraming.authorization,
        parentAuthorization
      );

    calloutFraming.profile = await this.calloutFramingService.getProfile(
      calloutFraming
    );
    calloutFraming.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        calloutFraming.profile,
        calloutFraming.authorization
      );

    if (calloutFraming.whiteboard) {
      calloutFraming.whiteboard =
        await this.whiteboardAuthorizationService.applyAuthorizationPolicy(
          calloutFraming.whiteboard,
          calloutFraming.authorization
        );
    }

    if (calloutFraming.whiteboardRt) {
      calloutFraming.whiteboardRt =
        await this.whiteboardRtAuthorizationService.applyAuthorizationPolicy(
          calloutFraming.whiteboardRt,
          calloutFraming.authorization
        );
    }

    return this.calloutFramingRepository.save(calloutFraming);
  }
}
