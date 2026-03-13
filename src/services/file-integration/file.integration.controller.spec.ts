import { createMock } from '@golevelup/ts-vitest';
import { RmqContext } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { FileIntegrationController } from './file.integration.controller';
import { FileIntegrationService } from './file.integration.service';
import { FileInfoInputData } from './inputs';
import { FileInfoOutputData, HealthCheckOutputData } from './outputs';

vi.mock('../util', () => ({
  ack: vi.fn(),
}));

// Import after vi.mock so the mock is applied
import { ack } from '../util';

describe('FileIntegrationController', () => {
  let controller: FileIntegrationController;
  let integrationService: FileIntegrationService;
  let mockContext: RmqContext;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockContext = createMock<RmqContext>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileIntegrationController],
      providers: [MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    controller = module.get(FileIntegrationController);
    integrationService = module.get(FileIntegrationService);
  });

  describe('fileInfo', () => {
    it('should acknowledge the message and delegate to the service', async () => {
      const input = new FileInfoInputData('doc-1', {
        authorization: 'Bearer token',
      });
      const expectedOutput = new FileInfoOutputData({
        read: true,
        fileName: 'ext-1',
        mimeType: 'application/pdf',
      });

      vi.mocked(integrationService.fileInfo).mockResolvedValue(expectedOutput);

      const result = await controller.fileInfo(input, mockContext);

      expect(ack).toHaveBeenCalledWith(mockContext);
      expect(integrationService.fileInfo).toHaveBeenCalledWith(input);
      expect(result).toBe(expectedOutput);
    });
  });

  describe('health', () => {
    it('should acknowledge the message and return healthy status', () => {
      const result = controller.health(mockContext);

      expect(ack).toHaveBeenCalledWith(mockContext);
      expect(result).toBeInstanceOf(HealthCheckOutputData);
      expect(result.healthy).toBe(true);
      expect(result.event).toBe('health-check-output');
    });
  });
});
