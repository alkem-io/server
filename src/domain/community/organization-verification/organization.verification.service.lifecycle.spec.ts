import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { InvalidStateTransitionException } from '@common/exceptions/invalid.state.tranistion.exception';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import {
  OrganizationVerificationLifecycleService,
  OrganizationVerificationLifecycleState,
} from './organization.verification.service.lifecycle';

describe('OrganizationVerificationLifecycleService', () => {
  let service: OrganizationVerificationLifecycleService;
  let lifecycleService: {
    getState: Mock;
    getNextEvents: Mock;
    isFinalState: Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationVerificationLifecycleService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(OrganizationVerificationLifecycleService);
    lifecycleService = module.get(LifecycleService) as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getState', () => {
    it('should delegate to lifecycleService.getState', () => {
      const mockLifecycle = { id: 'lc-1' } as any;
      lifecycleService.getState.mockReturnValue('notVerified');

      const result = service.getState(mockLifecycle);

      expect(lifecycleService.getState).toHaveBeenCalledWith(
        mockLifecycle,
        expect.anything()
      );
      expect(result).toBe('notVerified');
    });
  });

  describe('getNextEvents', () => {
    it('should delegate to lifecycleService.getNextEvents', () => {
      const mockLifecycle = { id: 'lc-1' } as any;
      lifecycleService.getNextEvents.mockReturnValue(['VERIFICATION_REQUEST']);

      const result = service.getNextEvents(mockLifecycle);

      expect(lifecycleService.getNextEvents).toHaveBeenCalledWith(
        mockLifecycle,
        expect.anything()
      );
      expect(result).toEqual(['VERIFICATION_REQUEST']);
    });
  });

  describe('isFinalState', () => {
    it('should delegate to lifecycleService.isFinalState', () => {
      const mockLifecycle = { id: 'lc-1' } as any;
      lifecycleService.isFinalState.mockReturnValue(false);

      const result = service.isFinalState(mockLifecycle);

      expect(lifecycleService.isFinalState).toHaveBeenCalledWith(
        mockLifecycle,
        expect.anything()
      );
      expect(result).toBe(false);
    });

    it('should return true for final state', () => {
      const mockLifecycle = { id: 'lc-1' } as any;
      lifecycleService.isFinalState.mockReturnValue(true);

      const result = service.isFinalState(mockLifecycle);
      expect(result).toBe(true);
    });
  });

  describe('getOrganizationVerificationMachine', () => {
    it('should return the state machine', () => {
      const machine = service.getOrganizationVerificationMachine();
      expect(machine).toBeDefined();
    });
  });

  describe('getOrganizationVerificationState', () => {
    it('should return NOT_VERIFIED for notVerified state', () => {
      const mockLifecycle = { id: 'lc-1' } as any;
      lifecycleService.getState.mockReturnValue(
        OrganizationVerificationLifecycleState.NOT_VERIFIED
      );

      const result = service.getOrganizationVerificationState(mockLifecycle);
      expect(result).toBe(OrganizationVerificationEnum.NOT_VERIFIED);
    });

    it('should return NOT_VERIFIED for verificationPending state', () => {
      const mockLifecycle = { id: 'lc-1' } as any;
      lifecycleService.getState.mockReturnValue(
        OrganizationVerificationLifecycleState.VERIFICATION_PENDING
      );

      const result = service.getOrganizationVerificationState(mockLifecycle);
      expect(result).toBe(OrganizationVerificationEnum.NOT_VERIFIED);
    });

    it('should return NOT_VERIFIED for rejected state', () => {
      const mockLifecycle = { id: 'lc-1' } as any;
      lifecycleService.getState.mockReturnValue(
        OrganizationVerificationLifecycleState.REJECTED
      );

      const result = service.getOrganizationVerificationState(mockLifecycle);
      expect(result).toBe(OrganizationVerificationEnum.NOT_VERIFIED);
    });

    it('should return NOT_VERIFIED for archived state', () => {
      const mockLifecycle = { id: 'lc-1' } as any;
      lifecycleService.getState.mockReturnValue(
        OrganizationVerificationLifecycleState.ARCHIVED
      );

      const result = service.getOrganizationVerificationState(mockLifecycle);
      expect(result).toBe(OrganizationVerificationEnum.NOT_VERIFIED);
    });

    it('should return VERIFIED_MANUAL_ATTESTATION for manuallyVerified state', () => {
      const mockLifecycle = { id: 'lc-1' } as any;
      lifecycleService.getState.mockReturnValue(
        OrganizationVerificationLifecycleState.MANUALLY_VERIFIED
      );

      const result = service.getOrganizationVerificationState(mockLifecycle);
      expect(result).toBe(
        OrganizationVerificationEnum.VERIFIED_MANUAL_ATTESTATION
      );
    });

    it('should throw InvalidStateTransitionException for unrecognized state', () => {
      const mockLifecycle = { id: 'lc-1' } as any;
      lifecycleService.getState.mockReturnValue('unknownState');

      expect(() =>
        service.getOrganizationVerificationState(mockLifecycle)
      ).toThrow(InvalidStateTransitionException);
    });
  });
});
