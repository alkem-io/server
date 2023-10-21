import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MachineOptions } from 'xstate';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { EntityNotInitializedException } from '@common/exceptions';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { OrganizationVerificationEventInput } from './dto/organization.verification.dto.event';
import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { OrganizationVerificationService } from './organization.verification.service';
import { IOrganizationVerification } from './organization.verification.interface';

@Injectable()
export class OrganizationVerificationLifecycleOptionsProvider {
  constructor(
    private lifecycleService: LifecycleService,
    private organizationVerificationService: OrganizationVerificationService,
    private authorizationService: AuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async eventOnOrganizationVerfication(
    organizationVerificationEventData: OrganizationVerificationEventInput,
    agentInfo: AgentInfo
  ): Promise<IOrganizationVerification> {
    const organizationVerification =
      await this.organizationVerificationService.getOrganizationVerificationOrFail(
        organizationVerificationEventData.organizationVerificationID
      );

    if (!organizationVerification.lifecycle)
      throw new EntityNotInitializedException(
        `Verification Lifecycle not initialized on Organization: ${organizationVerification.id}`,
        LogContext.COMMUNITY
      );

    // Send the event, translated if needed
    this.logger.verbose?.(
      `Event ${organizationVerificationEventData.eventName} triggered on organization: ${organizationVerification.id} using lifecycle ${organizationVerification.lifecycle.id}`,
      LogContext.COMMUNITY
    );
    await this.lifecycleService.event(
      {
        ID: organizationVerification.lifecycle.id,
        eventName: organizationVerificationEventData.eventName,
      },
      this.organizationVerificationLifecycleMachineOptions,
      agentInfo,
      organizationVerification.authorization
    );

    return await this.organizationVerificationService.getOrganizationVerificationOrFail(
      organizationVerification.id
    );
  }

  private organizationVerificationLifecycleMachineOptions: Partial<
    MachineOptions<any, any>
  > = {
    actions: {
      organizationManuallyVerified: async (_, event: any) => {
        const organizationVerification =
          await this.organizationVerificationService.getOrganizationVerificationOrFail(
            event.parentID,
            {
              relations: { lifecycle: true },
            }
          );
        const lifecycle = organizationVerification.lifecycle;
        if (!lifecycle) {
          throw new EntityNotInitializedException(
            `Verification Lifecycle not initialized on Organization: ${organizationVerification.id}`,
            LogContext.COMMUNITY
          );
        }
        organizationVerification.status =
          OrganizationVerificationEnum.VERIFIED_MANUAL_ATTESTATION;
        await this.organizationVerificationService.save(
          organizationVerification
        );
      },
    },
    guards: {
      // To actually assign the verified status the GRANT privilege is needed on the verification
      organizationVerificationGrantAuthorized: (_, event) => {
        const agentInfo: AgentInfo = event.agentInfo;
        const authorizationPolicy: IAuthorizationPolicy = event.authorization;
        return this.authorizationService.isAccessGranted(
          agentInfo,
          authorizationPolicy,
          AuthorizationPrivilege.GRANT
        );
      },
      organizationVerificationUpdateAuthorized: (_, event) => {
        const agentInfo: AgentInfo = event.agentInfo;
        const authorizationPolicy: IAuthorizationPolicy = event.authorization;
        return this.authorizationService.isAccessGranted(
          agentInfo,
          authorizationPolicy,
          AuthorizationPrivilege.UPDATE
        );
      },
    },
  };
}
