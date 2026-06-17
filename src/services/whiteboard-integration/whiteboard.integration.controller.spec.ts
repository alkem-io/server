import { RmqContext } from '@nestjs/microservices';
import {
  FetchContentData,
  FetchOutputData,
  HealthCheckOutputData,
  SaveContentData,
  SaveOutputData,
} from '@services/whiteboard-integration/outputs';
import { WhiteboardIntegrationController } from '@services/whiteboard-integration/whiteboard.integration.controller';
import { WhiteboardIntegrationService } from '@services/whiteboard-integration/whiteboard.integration.service';
import type { Mocked } from 'vitest';
import { vi } from 'vitest';

describe('WhiteboardIntegrationController', () => {
  let controller: WhiteboardIntegrationController;
  let integrationService: Mocked<WhiteboardIntegrationService>;
  let rmqContext: Mocked<RmqContext>;
  let mockChannel: { ack: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    integrationService = {
      info: vi.fn(),
      contribution: vi.fn(),
      contentModified: vi.fn(),
      save: vi.fn(),
      fetch: vi.fn(),
      accessGranted: vi.fn(),
    } as unknown as Mocked<WhiteboardIntegrationService>;

    mockChannel = { ack: vi.fn() };
    rmqContext = {
      getChannelRef: vi.fn().mockReturnValue(mockChannel),
      getMessage: vi.fn().mockReturnValue({ content: Buffer.from('{}') }),
    } as unknown as Mocked<RmqContext>;

    controller = new WhiteboardIntegrationController(integrationService);
  });

  describe('info()', () => {
    it('acknowledges the message and delegates to service', async () => {
      const infoResult = { read: true, update: false, maxCollaborators: 10 };
      integrationService.info.mockResolvedValue(infoResult);

      const payload = {
        userId: 'user-1',
        whiteboardId: 'wb-1',
        guestName: '',
      } as any;
      const result = await controller.info(payload, rmqContext);

      expect(mockChannel.ack).toHaveBeenCalled();
      expect(integrationService.info).toHaveBeenCalledWith(payload);
      expect(result).toEqual(infoResult);
    });
  });

  describe('contribution()', () => {
    it('acknowledges the message and delegates to service', () => {
      const payload = {
        whiteboardId: 'wb-1',
        users: [{ id: 'user-a' }],
      } as any;
      controller.contribution(payload, rmqContext);

      expect(mockChannel.ack).toHaveBeenCalled();
      expect(integrationService.contribution).toHaveBeenCalledWith(payload);
    });
  });

  describe('contentModified()', () => {
    it('acknowledges the message and delegates to service', () => {
      const payload = {
        triggeredBy: 'user-1',
        whiteboardId: 'wb-1',
      } as any;
      controller.contentModified(payload, rmqContext);

      expect(mockChannel.ack).toHaveBeenCalled();
      expect(integrationService.contentModified).toHaveBeenCalledWith(payload);
    });
  });

  describe('health()', () => {
    it('acknowledges the message and returns healthy status', () => {
      const result = controller.health(rmqContext);

      expect(mockChannel.ack).toHaveBeenCalled();
      expect(result).toBeInstanceOf(HealthCheckOutputData);
      expect(result.healthy).toBe(true);
    });
  });

  describe('save()', () => {
    it('acknowledges the message and delegates to service', async () => {
      const saveResult = new SaveOutputData(new SaveContentData());
      integrationService.save.mockResolvedValue(saveResult);

      const payload = { whiteboardId: 'wb-1', content: '{}' } as any;
      const result = await controller.save(payload, rmqContext);

      expect(mockChannel.ack).toHaveBeenCalled();
      expect(integrationService.save).toHaveBeenCalledWith(payload);
      expect(result).toBe(saveResult);
    });
  });

  describe('fetch()', () => {
    it('acknowledges the message and delegates to service', async () => {
      const fetchResult = new FetchOutputData(
        new FetchContentData('{"elements":[]}')
      );
      integrationService.fetch.mockResolvedValue(fetchResult);

      const payload = { whiteboardId: 'wb-1' } as any;
      const result = await controller.fetch(payload, rmqContext);

      expect(mockChannel.ack).toHaveBeenCalled();
      expect(integrationService.fetch).toHaveBeenCalledWith(payload);
      expect(result).toBe(fetchResult);
    });
  });
});
