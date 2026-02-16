import { STORAGE_SERVICE } from '@common/constants';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { DocumentService } from '@domain/storage/document/document.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { FileIntegrationService } from './file.integration.service';
import { FileInfoInputData } from './inputs';
import { ReadOutputErrorCode } from './outputs';

describe('FileIntegrationService', () => {
  let service: FileIntegrationService;
  let authenticationService: AuthenticationService;
  let authorizationService: AuthorizationService;
  let documentService: DocumentService;
  let storageService: { exists: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    storageService = { exists: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileIntegrationService,
        MockWinstonProvider,
        {
          provide: STORAGE_SERVICE,
          useValue: storageService,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(FileIntegrationService);
    authenticationService = module.get(AuthenticationService);
    authorizationService = module.get(AuthorizationService);
    documentService = module.get(DocumentService);
  });

  describe('fileInfo', () => {
    it('should return FILE_NOT_FOUND error when docId is empty', async () => {
      const input = new FileInfoInputData('', {
        authorization: 'Bearer token',
      });

      const result = await service.fileInfo(input);

      expect(result.data.read).toBe(false);
      expect((result.data as any).errorCode).toBe(
        ReadOutputErrorCode.FILE_NOT_FOUND
      );
    });

    it('should return NO_AUTH_PROVIDED error when auth is empty object', async () => {
      const input = new FileInfoInputData('doc-1', {});

      const result = await service.fileInfo(input);

      expect(result.data.read).toBe(false);
      expect((result.data as any).errorCode).toBe(
        ReadOutputErrorCode.NO_AUTH_PROVIDED
      );
    });

    it('should return DOCUMENT_NOT_FOUND error when document not found', async () => {
      const input = new FileInfoInputData('doc-1', {
        authorization: 'Bearer token',
      });

      vi.mocked(authenticationService.getAgentInfo).mockResolvedValue({
        agentID: 'agent-1',
      } as any);
      vi.mocked(documentService.getDocumentOrFail).mockRejectedValue(
        new Error('Not found')
      );

      const result = await service.fileInfo(input);

      expect(result.data.read).toBe(false);
      expect((result.data as any).errorCode).toBe(
        ReadOutputErrorCode.DOCUMENT_NOT_FOUND
      );
    });

    it('should return FILE_NOT_FOUND error when file does not exist in storage', async () => {
      const input = new FileInfoInputData('doc-1', {
        authorization: 'Bearer token',
      });

      vi.mocked(authenticationService.getAgentInfo).mockResolvedValue({
        agentID: 'agent-1',
      } as any);
      vi.mocked(documentService.getDocumentOrFail).mockResolvedValue({
        id: 'doc-1',
        externalID: 'ext-1',
        authorization: { id: 'auth-1' },
      } as any);
      storageService.exists.mockReturnValue(false);

      const result = await service.fileInfo(input);

      expect(result.data.read).toBe(false);
      expect((result.data as any).errorCode).toBe(
        ReadOutputErrorCode.FILE_NOT_FOUND
      );
    });

    it('should return NO_READ_ACCESS error when user lacks read privilege', async () => {
      const input = new FileInfoInputData('doc-1', {
        authorization: 'Bearer token',
      });

      vi.mocked(authenticationService.getAgentInfo).mockResolvedValue({
        agentID: 'agent-1',
      } as any);
      vi.mocked(documentService.getDocumentOrFail).mockResolvedValue({
        id: 'doc-1',
        externalID: 'ext-1',
        authorization: { id: 'auth-1' },
      } as any);
      storageService.exists.mockReturnValue(true);
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(false);

      const result = await service.fileInfo(input);

      expect(result.data.read).toBe(false);
      expect((result.data as any).errorCode).toBe(
        ReadOutputErrorCode.NO_READ_ACCESS
      );
    });

    it('should return success with file info when all checks pass', async () => {
      const input = new FileInfoInputData('doc-1', {
        authorization: 'Bearer token',
      });

      vi.mocked(authenticationService.getAgentInfo).mockResolvedValue({
        agentID: 'agent-1',
      } as any);
      vi.mocked(documentService.getDocumentOrFail).mockResolvedValue({
        id: 'doc-1',
        externalID: 'ext-1',
        mimeType: 'application/pdf',
        authorization: { id: 'auth-1' },
      } as any);
      storageService.exists.mockReturnValue(true);
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);

      const result = await service.fileInfo(input);

      expect(result.data.read).toBe(true);
      expect((result.data as any).fileName).toBe('ext-1');
      expect((result.data as any).mimeType).toBe('application/pdf');
    });
  });
});
