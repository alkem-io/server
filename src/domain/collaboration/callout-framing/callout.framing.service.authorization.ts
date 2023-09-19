import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { CalloutFramingService } from './callout.framing.service';
import { CalloutFraming } from './callout.framing.entity';
import { ICalloutFraming } from './callout.framing.interface';

@Injectable()
export class CalloutFramingAuthorizationService {
  constructor(
    private calloutFramingService: CalloutFramingService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
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

    return this.calloutFramingRepository.save(calloutFraming);
  }
}
