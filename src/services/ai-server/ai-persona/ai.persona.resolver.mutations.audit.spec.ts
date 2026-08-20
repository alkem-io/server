import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformOperationsAuditService } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { AiPersonaResolverMutations } from './ai.persona.resolver.mutations';
import { AiPersonaService } from './ai.persona.service';

describe('AiPersonaResolverMutations audit trail', () => {
  let resolver: AiPersonaResolverMutations;
  let aiPersonaService: Record<string, Mock>;
  let platformOperationsAuditService: Record<string, Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiPersonaResolverMutations],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(AiPersonaResolverMutations);
    aiPersonaService = module.get(AiPersonaService) as unknown as Record<
      string,
      Mock
    >;
    platformOperationsAuditService = module.get(
      PlatformOperationsAuditService
    ) as unknown as Record<string, Mock>;
    (
      module.get(AuthorizationService) as unknown as Record<string, Mock>
    ).grantAccessOrFail.mockReturnValue(undefined);
    platformOperationsAuditService.recordOperation.mockResolvedValue(undefined);
  });

  it('records the safe success details for a prompt-graph activation', async () => {
    const actorContext = { actorID: 'user-1' } as any;
    const updateData = {
      ID: 'persona-1',
      promptGraph: { nodes: [{ prompt: 'must not be audited' }] },
    };
    const persona = { id: 'persona-1', engine: 'generic-openai' };
    aiPersonaService.getAiPersonaOrFail.mockResolvedValue(persona);
    aiPersonaService.updateAiPersona.mockResolvedValue(persona);

    await resolver.aiServerUpdateAiPersona(actorContext, updateData as any);

    expect(platformOperationsAuditService.recordOperation).toHaveBeenCalledWith(
      {
        actorID: 'user-1',
        action: 'aiServerUpdateAiPersona',
        target: {
          aiPersonaID: 'persona-1',
          engine: 'generic-openai',
          promptGraphChanged: true,
        },
        outcome: 'success',
      }
    );
  });

  it('records a failure without raw graph data or error details', async () => {
    const actorContext = { actorID: 'user-1' } as any;
    const updateData = {
      ID: 'persona-1',
      promptGraph: { nodes: [{ prompt: 'must not be audited' }] },
    };
    const persona = { id: 'persona-1', engine: 'generic-openai' };
    const updateError = new Error('update failed');
    aiPersonaService.getAiPersonaOrFail.mockResolvedValue(persona);
    aiPersonaService.updateAiPersona.mockRejectedValue(updateError);

    await expect(
      resolver.aiServerUpdateAiPersona(actorContext, updateData as any)
    ).rejects.toThrow(updateError);

    expect(platformOperationsAuditService.recordOperation).toHaveBeenCalledWith(
      {
        actorID: 'user-1',
        action: 'aiServerUpdateAiPersona',
        target: {
          aiPersonaID: 'persona-1',
          engine: 'generic-openai',
          promptGraphChanged: true,
        },
        outcome: 'failure',
      }
    );
  });
});
