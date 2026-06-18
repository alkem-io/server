import { COLLABORATION_SERVICE } from '@common/constants/providers';
import { CollaborationContentType } from '@common/enums/collaboration.content.type';
import { ClientProxy } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { type Mocked, vi } from 'vitest';
import { CollaborationLifecycleEvent } from './collaboration.lifecycle.event.pattern';
import { CollaborationLifecycleService } from './collaboration.lifecycle.service';

describe('CollaborationLifecycleService', () => {
  let service: CollaborationLifecycleService;
  let client: Mocked<ClientProxy>;

  const clientMock = { emit: vi.fn() };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaborationLifecycleService,
        MockWinstonProvider,
        { provide: COLLABORATION_SERVICE, useValue: clientMock },
      ],
    }).compile();

    service = module.get(CollaborationLifecycleService);
    client = module.get(COLLABORATION_SERVICE) as Mocked<ClientProxy>;
  });

  it('emits document.deleted exactly once with the id', () => {
    service.emitDocumentDeleted('doc-1');

    expect(client.emit).toHaveBeenCalledTimes(1);
    expect(client.emit).toHaveBeenCalledWith(
      CollaborationLifecycleEvent.DELETED,
      { id: 'doc-1' }
    );
  });

  it('emits document.created with content type and ownerRef', () => {
    service.emitDocumentCreated(
      'doc-1',
      CollaborationContentType.MEMO,
      'owner-1'
    );

    expect(client.emit).toHaveBeenCalledWith(
      CollaborationLifecycleEvent.CREATED,
      {
        id: 'doc-1',
        contentType: CollaborationContentType.MEMO,
        ownerRef: 'owner-1',
      }
    );
  });

  it('emits document.access_changed with the id', () => {
    service.emitDocumentAccessChanged('doc-1');

    expect(client.emit).toHaveBeenCalledWith(
      CollaborationLifecycleEvent.ACCESS_CHANGED,
      { id: 'doc-1' }
    );
  });

  it('never throws when the emit fails (fire-and-forget)', () => {
    clientMock.emit.mockImplementationOnce(() => {
      throw new Error('broker down');
    });

    expect(() => service.emitDocumentDeleted('doc-1')).not.toThrow();
  });
});

describe('CollaborationLifecycleService without a client', () => {
  it('degrades to a no-op when the collaboration client is absent', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CollaborationLifecycleService, MockWinstonProvider],
    }).compile();

    const service = module.get(CollaborationLifecycleService);

    expect(() => service.emitDocumentDeleted('doc-1')).not.toThrow();
  });
});
