import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { CollaborativeDocumentIntegrationController } from './collaborative-document-integration.controller';
import { CollaborativeDocumentIntegrationService } from './collaborative-document-integration.service';
import {
  FetchInputData,
  InfoInputData,
  MemoContributionsInputData,
  SaveInputData,
  WhoInputData,
} from './inputs';
import { HealthCheckOutputData } from './outputs';

// Mock the ack utility to avoid RabbitMQ dependencies
vi.mock('@services/util', () => ({
  ack: vi.fn(),
}));

describe('CollaborativeDocumentIntegrationController', () => {
  let controller: CollaborativeDocumentIntegrationController;
  let integrationService: {
    info: Mock;
    who: Mock;
    save: Mock;
    fetch: Mock;
    memoContributions: Mock;
  };

  const mockRmqContext = {
    getChannelRef: vi.fn().mockReturnValue({ ack: vi.fn() }),
    getMessage: vi.fn().mockReturnValue({}),
    getPattern: vi.fn(),
    getArgs: vi.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaborativeDocumentIntegrationController,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    controller = module.get(CollaborativeDocumentIntegrationController);
    integrationService = module.get(
      CollaborativeDocumentIntegrationService
    ) as any;
  });

  describe('info', () => {
    it('should delegate to integrationService.info and return its result', async () => {
      const payload = {
        userId: 'user-1',
        documentId: 'doc-1',
      } as InfoInputData;
      const expected = {
        read: true,
        update: false,
        isMultiUser: true,
        maxCollaborators: 10,
      };
      integrationService.info.mockResolvedValue(expected);

      const result = await controller.info(payload, mockRmqContext);

      expect(integrationService.info).toHaveBeenCalledWith(payload);
      expect(result).toEqual(expected);
    });
  });

  describe('who', () => {
    it('should delegate to integrationService.who and return its result', async () => {
      const payload = {
        auth: { cookie: 'session=abc' },
      } as WhoInputData;
      integrationService.who.mockResolvedValue('user-42');

      const result = await controller.who(payload, mockRmqContext);

      expect(integrationService.who).toHaveBeenCalledWith(payload);
      expect(result).toBe('user-42');
    });
  });

  describe('health', () => {
    it('should return a HealthCheckOutputData with healthy=true', () => {
      const result = controller.health(mockRmqContext);

      expect(result).toBeInstanceOf(HealthCheckOutputData);
      expect(result.healthy).toBe(true);
    });
  });

  describe('save', () => {
    it('should delegate to integrationService.save and return its result', async () => {
      const payload = {
        documentId: 'doc-1',
        binaryStateInBase64: Buffer.from('content').toString('base64'),
      } as SaveInputData;
      const expected = { event: 'save-output', data: { success: true } };
      integrationService.save.mockResolvedValue(expected);

      const result = await controller.save(payload, mockRmqContext);

      expect(integrationService.save).toHaveBeenCalledWith(payload);
      expect(result).toEqual(expected);
    });
  });

  describe('fetch', () => {
    it('should delegate to integrationService.fetch and return its result', async () => {
      const payload = { documentId: 'doc-1' } as FetchInputData;
      const expected = {
        event: 'fetch-output',
        data: { contentBase64: 'abc' },
      };
      integrationService.fetch.mockResolvedValue(expected);

      const result = await controller.fetch(payload, mockRmqContext);

      expect(integrationService.fetch).toHaveBeenCalledWith(payload);
      expect(result).toEqual(expected);
    });
  });

  describe('memoContribution', () => {
    it('should delegate to integrationService.memoContributions', async () => {
      const payload = {
        memoId: 'memo-1',
        users: [{ id: 'user-1' }],
      } as MemoContributionsInputData;
      integrationService.memoContributions.mockResolvedValue(undefined);

      await controller.memoContribution(payload, mockRmqContext);

      expect(integrationService.memoContributions).toHaveBeenCalledWith(
        payload
      );
    });
  });
});
