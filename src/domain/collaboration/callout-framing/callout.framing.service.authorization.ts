import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { CalloutFramingService } from './callout.framing.service';
import { CalloutFraming } from './callout.framing.entity';
import { ICalloutFraming } from './callout.framing.interface';
import { WhiteboardAuthorizationService } from '@domain/common/whiteboard';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { LogContext } from '@common/enums/logging.context';

@Injectable()
export class CalloutFramingAuthorizationService {
  constructor(
    private calloutFramingService: CalloutFramingService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private whiteboardAuthorizationService: WhiteboardAuthorizationService,
    @InjectRepository(CalloutFraming)
    private calloutFramingRepository: Repository<CalloutFraming>
  ) {}

  public async applyAuthorizationPolicy(
    calloutFramingInput: ICalloutFraming,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ICalloutFraming> {
    const calloutFraming =
      await this.calloutFramingService.getCalloutFramingOrFail(
        calloutFramingInput.id,
        {
          relations: {
            whiteboard: {
              profile: true,
            },
            profile: true,
          },
        }
      );

    if (!calloutFraming.profile) {
      throw new RelationshipNotFoundException(
        `Unable to load Profile on calloutFraming:  ${calloutFraming.id} `,
        LogContext.COLLABORATION
      );
    }

    calloutFraming.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        calloutFraming.authorization,
        parentAuthorization
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

    return this.calloutFramingRepository.save(calloutFraming);
  }
}
