import { ActorService } from '@domain/actor/actor/actor.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ILicensePlan } from '@platform/licensing/credential-based/license-plan/license.plan.interface';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { LicenseIssuerService } from './license.issuer.service';

describe('LicenseIssuerService', () => {
  let service: LicenseIssuerService;
  let actorService: ActorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LicenseIssuerService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(LicenseIssuerService);
    actorService = module.get(ActorService);
  });

  describe('assignLicensePlan', () => {
    it('should grant credential without expiry when trialEnabled is false', async () => {
      const licensePlan = {
        id: 'plan-1',
        trialEnabled: false,
        licenseCredential: 'SPACE_LICENSE' as any,
      } as ILicensePlan;
      const mockCredential = {
        id: 'cred-1',
        type: 'SPACE_LICENSE',
        resourceID: 'resource-1',
      };

      vi.mocked(actorService.grantCredentialOrFail).mockResolvedValue(
        mockCredential as any
      );

      await service.assignLicensePlan('agent-1', licensePlan, 'resource-1');

      expect(actorService.grantCredentialOrFail).toHaveBeenCalledWith(
        'agent-1',
        {
          type: 'SPACE_LICENSE',
          resourceID: 'resource-1',
          expires: undefined,
        }
      );
    });

    it('should grant credential with one month expiry when trialEnabled is true', async () => {
      const licensePlan = {
        id: 'plan-1',
        trialEnabled: true,
        licenseCredential: 'SPACE_LICENSE' as any,
      } as ILicensePlan;
      const mockCredential = { id: 'cred-1' };

      vi.mocked(actorService.grantCredentialOrFail).mockResolvedValue(
        mockCredential as any
      );

      await service.assignLicensePlan('agent-1', licensePlan, 'resource-1');

      const callArgs = vi.mocked(actorService.grantCredentialOrFail).mock
        .calls[0][1];
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
    });

    it('should not throw when grantCredentialOrFail throws (logs warning instead)', async () => {
      const licensePlan = {
        id: 'plan-1',
        trialEnabled: false,
        licenseCredential: 'SPACE_LICENSE' as any,
      } as ILicensePlan;

      vi.mocked(actorService.grantCredentialOrFail).mockRejectedValue(
        new Error('Grant failed')
      );

      // assignLicensePlan catches the error and logs a warning
      await expect(
        service.assignLicensePlan('agent-1', licensePlan, 'resource-1')
      ).resolves.toBeUndefined();
    });
  });

  describe('revokeLicensePlan', () => {
    it('should call actorService.revokeCredential with correct parameters', async () => {
      const licensePlan = {
        id: 'plan-1',
        licenseCredential: 'SPACE_LICENSE' as any,
      } as ILicensePlan;

      vi.mocked(actorService.revokeCredential).mockResolvedValue(true);

      await service.revokeLicensePlan('agent-1', licensePlan, 'resource-1');

      expect(actorService.revokeCredential).toHaveBeenCalledWith('agent-1', {
        type: 'SPACE_LICENSE',
        resourceID: 'resource-1',
      });
    });
  });
});
