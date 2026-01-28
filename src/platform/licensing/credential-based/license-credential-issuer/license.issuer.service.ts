import { IAgent } from '@domain/agent/agent/agent.interface';
import { AgentService } from '@domain/agent/agent/agent.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ILicensePlan } from '@platform/licensing/credential-based/license-plan/license.plan.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class LicenseIssuerService {
  constructor(
    private agentService: AgentService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async assignLicensePlan(
    agent: IAgent,
    licensePlan: ILicensePlan,
    resourceID: string
  ): Promise<IAgent> {
    let expires: Date | undefined;
    if (licensePlan.trialEnabled) {
      const now = new Date();
      const oneMonthFromNow = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate(),
        0,
        0,
        0
      );
      expires = oneMonthFromNow;
    }
    let updatedAgent: IAgent = agent;
    try {
      updatedAgent = await this.agentService.grantCredentialOrFail({
        agentID: agent.id,
        type: licensePlan.licenseCredential,
        resourceID: resourceID,
        expires: expires,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to assign license credential ${licensePlan.licenseCredential}  ${licensePlan.id} to agent ${agent.id}: ${error}`
      );
    }

    return updatedAgent;
  }

  public async revokeLicensePlan(
    agent: IAgent,
    licensePlan: ILicensePlan,
    resourceID: string
  ): Promise<IAgent> {
    const updatedAgent = await this.agentService.revokeCredential({
      agentID: agent.id,
      type: licensePlan.licenseCredential,
      resourceID: resourceID,
    });
    return updatedAgent;
  }
}
