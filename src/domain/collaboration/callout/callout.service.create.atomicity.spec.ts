import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { MediaGallery } from '@domain/common/media-gallery/media.gallery.entity';
import { MediaGalleryService } from '@domain/common/media-gallery/media.gallery.service';
import { MemoService } from '@domain/common/memo/memo.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { VisualService } from '@domain/common/visual/visual.service';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { RoomService } from '@domain/communication/room/room.service';
import { ProfileDocumentsService } from '@domain/profile-documents/profile.documents.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken, getRepositoryToken } from '@nestjs/typeorm';
import { actorContextData } from '@test/data/actorContext.mock';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { vi } from 'vitest';
import { CalloutFraming } from '../callout-framing/callout.framing.entity';
import { CalloutFramingService } from '../callout-framing/callout.framing.service';
import { Callout } from './callout.entity';
import { CalloutService } from './callout.service';

/**
 * server#6614 (fix area 2, callout slice): every framing child built by
 * createCallout must either reach the database through the caller's single
 * cascading callout save, or be removed again when a later createCallout step
 * throws. Production showed 40 media galleries whose callout never persisted:
 * the gallery (and its storage bucket) used to be saved inline while the
 * callout was still being assembled.
 *
 * CalloutService, CalloutFramingService and MediaGalleryService are real here;
 * only their leaf collaborators are mocked, so the test sees every write the
 * create path would issue.
 */
describe('CalloutService.createCallout — framing children are atomic with the callout', () => {
  let service: CalloutService;
  let mediaGalleryRepository: Repository<MediaGallery>;
  let storageBucketService: StorageBucketService;
  let visualService: VisualService;
  let profileDocumentsService: ProfileDocumentsService;
  let whiteboardService: WhiteboardService;
  let memoService: MemoService;
  let roomService: RoomService;

  const storageAggregator = { id: 'agg-1' } as any;
  const laterStepFailure = new Error('room creation failed');

  const calloutInput = (framing: Record<string, unknown>) =>
    ({
      nameID: 'callout-1',
      framing: {
        profile: { displayName: 'Framing', tagsets: [] },
        tags: [],
        ...framing,
      },
    }) as any;

  const create = (input: any) =>
    service.createCallout(
      input,
      [],
      storageAggregator,
      actorContextData.actorContext,
      'user-1'
    );

  beforeEach(async () => {
    vi.restoreAllMocks();
    for (const entity of [Callout, CalloutFraming, MediaGallery]) {
      vi.spyOn(entity, 'create').mockImplementation((input?: any) =>
        Object.assign(new (entity as any)(), input)
      );
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutService,
        CalloutFramingService,
        MediaGalleryService,
        repositoryProviderMockFactory(Callout),
        repositoryProviderMockFactory(CalloutFraming),
        repositoryProviderMockFactory(MediaGallery),
        { provide: getEntityManagerToken('default'), useValue: {} },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CalloutService);
    mediaGalleryRepository = module.get(getRepositoryToken(MediaGallery));
    storageBucketService = module.get(StorageBucketService);
    visualService = module.get(VisualService);
    profileDocumentsService = module.get(ProfileDocumentsService);
    whiteboardService = module.get(WhiteboardService);
    memoService = module.get(MemoService);
    roomService = module.get(RoomService);

    vi.mocked(module.get(ProfileService).createProfile).mockResolvedValue({
      tagsets: [],
      storageBucket: {},
    } as any);
    vi.mocked(storageBucketService.createStorageBucket).mockReturnValue({
      id: undefined,
    } as any);
    vi.mocked(storageBucketService.save).mockImplementation(
      async bucket => ({ ...bucket, id: 'bucket-1' }) as any
    );
    vi.mocked(mediaGalleryRepository.save).mockImplementation(
      async gallery => ({ ...gallery, id: 'gallery-1' }) as any
    );
    vi.mocked(
      profileDocumentsService.reuploadFileOnStorageBucket
    ).mockResolvedValue('https://alkem.io/api/private/rest/storage/doc/1');
    vi.mocked(whiteboardService.createWhiteboard).mockResolvedValue({
      id: 'whiteboard-1',
    } as any);
    vi.mocked(whiteboardService.deleteWhiteboard).mockResolvedValue({} as any);
    vi.mocked(memoService.createMemo).mockResolvedValue({
      id: 'memo-1',
    } as any);
    vi.mocked(memoService.deleteMemo).mockResolvedValue({} as any);

    // The step after framing creation that fails: comments are enabled by
    // default, so a non-template callout always creates its room last.
    vi.mocked(roomService.createRoom).mockRejectedValue(laterStepFailure);
  });

  it('persists nothing for a MEDIA_GALLERY framing when a later step throws', async () => {
    await expect(
      create(
        calloutInput({
          type: CalloutFramingType.MEDIA_GALLERY,
          mediaGallery: {
            visuals: [{ name: 'MEDIA_GALLERY_IMAGE', uri: 'https://x/1.png' }],
          },
        })
      )
    ).rejects.toBe(laterStepFailure);

    expect(storageBucketService.save).not.toHaveBeenCalled();
    expect(mediaGalleryRepository.save).not.toHaveBeenCalled();
    expect(visualService.createVisual).not.toHaveBeenCalled();
    expect(visualService.saveVisual).not.toHaveBeenCalled();
    expect(
      profileDocumentsService.reuploadFileOnStorageBucket
    ).not.toHaveBeenCalled();
  });

  it('leaves the MEDIA_GALLERY tree unsaved for the caller’s cascading save', async () => {
    vi.mocked(roomService.createRoom).mockResolvedValue({ id: 'room' } as any);

    const callout = await create(
      calloutInput({
        type: CalloutFramingType.MEDIA_GALLERY,
        mediaGallery: { visuals: [] },
      })
    );

    expect(callout.framing.mediaGallery).toBeDefined();
    expect(callout.framing.mediaGallery?.id).toBeUndefined();
    expect(callout.framing.mediaGallery?.storageBucket).toBeDefined();
    expect(callout.framing.mediaGallery?.authorization).toBeDefined();
    expect(storageBucketService.save).not.toHaveBeenCalled();
    expect(mediaGalleryRepository.save).not.toHaveBeenCalled();
  });

  it('deletes the already-persisted WHITEBOARD framing child when a later step throws', async () => {
    await expect(
      create(
        calloutInput({
          type: CalloutFramingType.WHITEBOARD,
          whiteboard: { profile: { displayName: 'wb' } },
        })
      )
    ).rejects.toBe(laterStepFailure);

    expect(whiteboardService.deleteWhiteboard).toHaveBeenCalledWith(
      'whiteboard-1'
    );
  });

  it('deletes the already-persisted MEMO framing child when a later step throws', async () => {
    await expect(
      create(
        calloutInput({
          type: CalloutFramingType.MEMO,
          memo: { profile: { displayName: 'memo' } },
        })
      )
    ).rejects.toBe(laterStepFailure);

    expect(memoService.deleteMemo).toHaveBeenCalledWith('memo-1');
  });

  it('surfaces the original error even when the cleanup itself fails', async () => {
    vi.mocked(whiteboardService.deleteWhiteboard).mockRejectedValue(
      new Error('cleanup failed')
    );

    await expect(
      create(
        calloutInput({
          type: CalloutFramingType.WHITEBOARD,
          whiteboard: { profile: { displayName: 'wb' } },
        })
      )
    ).rejects.toBe(laterStepFailure);
  });

  it('deletes nothing when createCallout succeeds', async () => {
    vi.mocked(roomService.createRoom).mockResolvedValue({ id: 'room' } as any);

    await create(
      calloutInput({
        type: CalloutFramingType.WHITEBOARD,
        whiteboard: { profile: { displayName: 'wb' } },
      })
    );

    expect(whiteboardService.deleteWhiteboard).not.toHaveBeenCalled();
  });
});
