import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationService } from './application.service';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { Application } from './application.entity';
import { IApplication } from './application.interface';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';

@Injectable()
export class ApplicationAuthorizationService {
  constructor(
    private applicationService: ApplicationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>
  ) {}

  async applyAuthorizationPolicy(
    application: IApplication,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IApplication> {
    application.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        application.authorization,
        parentAuthorization
      );

    application.authorization = await this.extendAuthorizationPolicy(
      application
    );

    return await this.applicationRepository.save(application);
  }

  private async extendAuthorizationPolicy(
    application: IApplication
  ): Promise<IAuthorizationPolicy> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // get the user
    const user = await this.applicationService.getUser(application.id);

    // also grant the user privileges to manage their own application
    const userApplicationRule =
      this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [
          {
            type: AuthorizationCredential.USER_SELF_MANAGEMENT,
            resourceID: user.id,
          },
        ],
        'applicationUserApplication'
      );
    newRules.push(userApplicationRule);

    //
    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        application.authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
