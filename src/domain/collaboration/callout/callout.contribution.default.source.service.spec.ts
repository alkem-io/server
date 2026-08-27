import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ValidationException } from '@common/exceptions';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { Test, TestingModule } from '@nestjs/testing';
import { actorContextData } from '@test/data/actorContext.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { Mocked } from 'vitest';
import { CalloutContributionDefaultSourceService } from './callout.contribution.default.source.service';
import { CalloutService } from './callout.service';

describe('CalloutContributionDefaultSourceService', () => {
  let service: CalloutContributionDefaultSourceService;
  let calloutService: Mocked<CalloutService>;
  let authorizationService: Mocked<AuthorizationService>;
  let whiteboardService: Mocked<WhiteboardService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CalloutContributionDefaultSourceService],
    })
      .useMocker(defaultMockerFactory)
      .compile();
    service = module.get(CalloutContributionDefaultSourceService);
    calloutService = module.get(CalloutService) as Mocked<CalloutService>;
    authorizationService = module.get(
      AuthorizationService
    ) as Mocked<AuthorizationService>;
    whiteboardService = module.get(
      WhiteboardService
    ) as Mocked<WhiteboardService>;
  });

  it('rejects mutually exclusive source selectors before loading a source', async () => {
    await expect(
      service.prepare(
        {
          sourceCalloutID: 'callout-1',
          sourceWhiteboardID: 'whiteboard-1',
        },
        actorContextData.actorContext
      )
    ).rejects.toThrow(ValidationException);
    expect(calloutService.getCalloutOrFail).not.toHaveBeenCalled();
    expect(whiteboardService.resolveContentSource).not.toHaveBeenCalled();
  });

  it('includes clearWhiteboardContent in the mutual-exclusion rule', async () => {
    await expect(
      service.prepare(
        { sourceCalloutID: 'callout-1', clearWhiteboardContent: true },
        actorContextData.actorContext
      )
    ).rejects.toThrow(ValidationException);
  });

  it('authorizes and resolves a source Callout into content and owning bucket', async () => {
    const sourceCallout = {
      authorization: { id: 'source-auth' },
      contributionDefaults: { whiteboardContent: 'canonical-content' },
      framing: { profile: { storageBucket: { id: 'source-bucket' } } },
    } as any;
    calloutService.getCalloutOrFail.mockResolvedValue(sourceCallout);
    const defaults = { sourceCalloutID: 'callout-1' };

    await service.prepare(defaults, actorContextData.actorContext);

    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
      actorContextData.actorContext,
      sourceCallout.authorization,
      AuthorizationPrivilege.READ,
      expect.any(String)
    );
    expect(defaults).toMatchObject({
      whiteboardContent: 'canonical-content',
      sourceStorageBucketID: 'source-bucket',
    });
  });

  it('rejects source Callout content without an owning bucket', async () => {
    calloutService.getCalloutOrFail.mockResolvedValue({
      authorization: { id: 'source-auth' },
      contributionDefaults: { whiteboardContent: 'canonical-content' },
      framing: { profile: {} },
    } as any);

    await expect(
      service.prepare(
        { sourceCalloutID: 'callout-1' },
        actorContextData.actorContext
      )
    ).rejects.toThrow(
      'Source Callout has a Whiteboard default but no owning storage bucket'
    );
  });

  it('resolves a source Whiteboard through its authorization-owning service', async () => {
    whiteboardService.resolveContentSource.mockResolvedValue({
      content: 'canonical-content',
      storageBucketID: 'source-bucket',
    } as any);
    const defaults = { sourceWhiteboardID: 'whiteboard-1' };

    await service.prepare(defaults, actorContextData.actorContext);

    expect(whiteboardService.resolveContentSource).toHaveBeenCalledWith(
      'whiteboard-1',
      actorContextData.actorContext
    );
    expect(defaults).toMatchObject({
      whiteboardContent: 'canonical-content',
      sourceStorageBucketID: 'source-bucket',
    });
  });
});
