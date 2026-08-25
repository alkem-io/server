import { CollaborationContentType } from '@common/enums/collaboration.content.type';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { CollaborationIntegrationController } from './collaboration-integration.controller';
import { CollaborationIntegrationService } from './collaboration-integration.service';
import { CollaborationMessagePattern } from './types';

// A minimal RmqContext stub exposing the channel + message the `ack` util uses.
const rmqContext = () => {
  const channel = { ack: vi.fn() };
  const message = {};
  return {
    ctx: {
      getChannelRef: () => channel,
      getMessage: () => message,
    } as any,
    channel,
    message,
  };
};

describe('CollaborationIntegrationController', () => {
  let controller: CollaborationIntegrationController;
  let integrationService: {
    save: Mock;
    fetch: Mock;
    contribution: Mock;
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CollaborationIntegrationController],
      providers: [MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    controller = module.get(CollaborationIntegrationController);
    integrationService = module.get(CollaborationIntegrationService) as any;
  });

  it('acks and delegates save', async () => {
    const { ctx, channel } = rmqContext();
    integrationService.save.mockResolvedValue({ success: true });

    const data = {
      id: 'memo-1',
      contentType: CollaborationContentType.MEMO,
      version: 1,
      contentPointer: 'memo-1',
    };
    const result = await controller.save(data, ctx);

    expect(channel.ack).toHaveBeenCalledTimes(1);
    expect(integrationService.save).toHaveBeenCalledWith(data);
    expect(result).toEqual({ success: true });
  });

  it('acks and delegates fetch', async () => {
    const { ctx, channel } = rmqContext();
    integrationService.fetch.mockResolvedValue({ found: false });

    const result = await controller.fetch({ id: 'x' }, ctx);

    expect(channel.ack).toHaveBeenCalledTimes(1);
    expect(integrationService.fetch).toHaveBeenCalledWith({ id: 'x' });
    expect(result).toEqual({ found: false });
  });

  it('acks and delegates contribution', async () => {
    const { ctx, channel } = rmqContext();
    integrationService.contribution.mockResolvedValue(undefined);

    await controller.contribution({ id: 'x', users: [{ id: 'u' }] }, ctx);

    expect(channel.ack).toHaveBeenCalledTimes(1);
    expect(integrationService.contribution).toHaveBeenCalledWith({
      id: 'x',
      users: [{ id: 'u' }],
    });
  });

  it('registers EXACTLY the unified message patterns SAVE + FETCH — the producerless delete/info patterns are retired', () => {
    expect(Object.values(CollaborationMessagePattern)).toEqual([
      'collaboration-save',
      'collaboration-fetch',
    ]);
  });

  it('exposes no delete/info RPC handlers, only the surviving save/fetch/contribution + office-document surfaces', () => {
    expect((controller as unknown as Record<string, unknown>).delete).toBe(
      undefined
    );
    expect((controller as unknown as Record<string, unknown>).info).toBe(
      undefined
    );
    expect(typeof controller.save).toBe('function');
    expect(typeof controller.fetch).toBe('function');
    expect(typeof controller.contribution).toBe('function');
    expect(typeof controller.officeDocumentContribution).toBe('function');
    expect(typeof controller.officeDocumentView).toBe('function');
    expect(typeof controller.officeDocumentRename).toBe('function');
  });
});
