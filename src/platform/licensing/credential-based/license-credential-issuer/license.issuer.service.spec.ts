import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { LicenseIssuerService } from './license.issuer.service';
import { AgentService } from '@domain/agent/agent/agent.service';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { ILicensePlan } from '@platform/licensing/credential-based/license-plan/license.plan.interface';
import { vi } from 'vitest';

describe('LicenseIssuerService', () => {
  let service: LicenseIssuerService;
  let agentService: AgentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LicenseIssuerService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(LicenseIssuerService);
    agentService = module.get(AgentService);
  });

  describe('assignLicensePlan', () => {
    it('should grant credential without expiry when trialEnabled is false', async () => {
      const agent = { id: 'agent-1' } as IAgent;
      const licensePlan = {
        id: 'plan-1',
        trialEnabled: false,
        licenseCredential: 'SPACE_LICENSE' as any,
      } as ILicensePlan;
      const updatedAgent = { id: 'agent-1', credentials: [] } as unknown as IAgent;

      vi.mocked(agentService.grantCredentialOrFail).mockResolvedValue(
        updatedAgent
      );

      const result = await service.assignLicensePlan(
        agent,
        licensePlan,
        'resource-1'
      );

      expect(agentService.grantCredentialOrFail).toHaveBeenCalledWith({
        agentID: 'agent-1',
        type: 'SPACE_LICENSE',
        resourceID: 'resource-1',
        expires: undefined,
      });
      expect(result).toBe(updatedAgent);
    });

    it('should grant credential with one month expiry when trialEnabled is true', async () => {
      const agent = { id: 'agent-1' } as IAgent;
      const licensePlan = {
        id: 'plan-1',
        trialEnabled: true,
        licenseCredential: 'SPACE_LICENSE' as any,
      } as ILicensePlan;
      const updatedAgent = { id: 'agent-1' } as IAgent;

      vi.mocked(agentService.grantCredentialOrFail).mockResolvedValue(
        updatedAgent
      );

      const result = await service.assignLicensePlan(
        agent,
        licensePlan,
        'resource-1'
      );

      const callArgs = vi.mocked(agentService.grantCredentialOrFail).mock
        .calls[0][0];
      expect(callArgs.expires).toBeDefined();
      expect(callArgs.expires).toBeInstanceOf(Date);
      // The expiry should be approximately one month from now
      const now = new Date();
      const oneMonthFromNow = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate()
      );
      const expiresDate = callArgs.expires!;
      expect(expiresDate.getMonth()).toBe(oneMonthFromNow.getMonth());
      expect(result).toBe(updatedAgent);
    });

    it('should return original agent and log warning when grantCredentialOrFail throws', async () => {
      const agent = { id: 'agent-1' } as IAgent;
      const licensePlan = {
        id: 'plan-1',
        trialEnabled: false,
        licenseCredential: 'SPACE_LICENSE' as any,
      } as ILicensePlan;

      vi.mocked(agentService.grantCredentialOrFail).mockRejectedValue(
        new Error('Grant failed')
      );

      const result = await service.assignLicensePlan(
        agent,
        licensePlan,
        'resource-1'
      );

      expect(result).toBe(agent);
    });
  });

  describe('revokeLicensePlan', () => {
    it('should call agentService.revokeCredential with correct parameters', async () => {
      const agent = { id: 'agent-1' } as IAgent;
      const licensePlan = {
        id: 'plan-1',
        licenseCredential: 'SPACE_LICENSE' as any,
      } as ILicensePlan;
      const updatedAgent = { id: 'agent-1' } as IAgent;

      vi.mocked(agentService.revokeCredential).mockResolvedValue(updatedAgent);

      const result = await service.revokeLicensePlan(
        agent,
        licensePlan,
        'resource-1'
      );

      expect(agentService.revokeCredential).toHaveBeenCalledWith({
        agentID: 'agent-1',
        type: 'SPACE_LICENSE',
        resourceID: 'resource-1',
      });
      expect(result).toBe(updatedAgent);
    });
  });
});
