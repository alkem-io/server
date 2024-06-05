import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ILicensePlan } from '@platform/license-plan/license.plan.interface';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { AgentService } from '@domain/agent/agent/agent.service';

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
    let expires: Date | undefined = undefined;
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
    const updatedAgent = await this.agentService.grantCredential({
      agentID: agent.id,
      type: licensePlan.licenseCredential,
      resourceID: resourceID,
      expires: expires,
    });
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
