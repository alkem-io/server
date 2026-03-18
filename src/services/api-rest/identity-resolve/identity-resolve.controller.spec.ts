import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { Request } from 'express';
import { vi } from 'vitest';
import { IdentityResolveController } from './identity-resolve.controller';
import { IdentityResolveService } from './identity-resolve.service';

describe('IdentityResolveController', () => {
  let controller: IdentityResolveController;
  let identityResolveService: IdentityResolveService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdentityResolveController],
      providers: [
        MockWinstonProvider,
        {
          provide: IdentityResolveService,
          useValue: {
            resolveUser: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(IdentityResolveController);
    identityResolveService = module.get(IdentityResolveService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('resolveIdentity', () => {
    const mockUser = {
      id: 'user-123',
    };

    const mockRequest = {
      ip: '192.168.1.1',
      headers: {
        'user-agent': 'Mozilla/5.0',
      },
    } as unknown as Request;

    it('should call resolveUser with authenticationId and meta', async () => {
      vi.spyOn(identityResolveService, 'resolveUser').mockResolvedValue(
        mockUser as any
      );

      await controller.resolveIdentity(
        { authenticationId: 'auth-id-1' },
        mockRequest
      );

      expect(identityResolveService.resolveUser).toHaveBeenCalledWith(
        'auth-id-1',
        {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        }
      );
    });

    it('should return response with userId and actorID', async () => {
      vi.spyOn(identityResolveService, 'resolveUser').mockResolvedValue(
        mockUser as any
      );

      const result = await controller.resolveIdentity(
        { authenticationId: 'auth-id-1' },
        mockRequest
      );

      expect(result).toEqual({
        userId: 'user-123',
        actorID: 'user-123',
      });
    });

    it('should pass undefined userAgent when header is missing', async () => {
      vi.spyOn(identityResolveService, 'resolveUser').mockResolvedValue(
        mockUser as any
      );

      const requestWithoutUA = {
        ip: '10.0.0.1',
        headers: {},
      } as unknown as Request;

      await controller.resolveIdentity(
        { authenticationId: 'auth-id-1' },
        requestWithoutUA
      );

      expect(identityResolveService.resolveUser).toHaveBeenCalledWith(
        'auth-id-1',
        {
          ip: '10.0.0.1',
          userAgent: undefined,
        }
      );
    });

    it('should propagate service errors', async () => {
      vi.spyOn(identityResolveService, 'resolveUser').mockRejectedValue(
        new Error('Resolution failed')
      );

      await expect(
        controller.resolveIdentity(
          { authenticationId: 'auth-id-1' },
          mockRequest
        )
      ).rejects.toThrow('Resolution failed');
    });

    it('should handle undefined IP', async () => {
      vi.spyOn(identityResolveService, 'resolveUser').mockResolvedValue(
        mockUser as any
      );

      const requestWithoutIP = {
        ip: undefined,
        headers: {
          'user-agent': 'TestAgent/1.0',
        },
      } as unknown as Request;

      await controller.resolveIdentity(
        { authenticationId: 'auth-id-1' },
        requestWithoutIP
      );

      expect(identityResolveService.resolveUser).toHaveBeenCalledWith(
        'auth-id-1',
        {
          ip: undefined,
          userAgent: 'TestAgent/1.0',
        }
      );
    });
  });
});
