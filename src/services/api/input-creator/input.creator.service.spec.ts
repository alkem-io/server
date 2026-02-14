import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { RelationshipNotFoundException } from '@common/exceptions';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { InputCreatorService } from './input.creator.service';

describe('InputCreatorService', () => {
  let service: InputCreatorService;
  let calloutService: Record<string, Mock>;
  let collaborationService: Record<string, Mock>;
  let spaceLookupService: Record<string, Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InputCreatorService, MockWinstonProvider],
    })
      .useMocker(token => {
        if (typeof token === 'string' && token === 'defaultEntityManager') {
          return {
            findOneOrFail: vi.fn(),
          };
        }
        return defaultMockerFactory(token);
      })
      .compile();

    service = module.get(InputCreatorService);
    calloutService = module.get(CalloutService) as unknown as Record<
      string,
      Mock
    >;
    collaborationService = module.get(
      CollaborationService
    ) as unknown as Record<string, Mock>;
    spaceLookupService = module.get(
      SpaceLookupService
    ) as unknown as Record<string, Mock>;
  });

  describe('buildCreateInnovationFlowStateInputFromInnovationFlowState', () => {
    it('should map states to create inputs preserving displayName, description, settings, and sortOrder', () => {
      const states = [
        {
          id: 's1',
          displayName: 'State 1',
          description: 'First state',
          settings: { theme: 'blue' },
          sortOrder: 0,
        },
        {
          id: 's2',
          displayName: 'State 2',
          description: 'Second state',
          settings: { theme: 'red' },
          sortOrder: 1,
        },
      ] as any[];

      const result =
        service.buildCreateInnovationFlowStateInputFromInnovationFlowState(
          states
        );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        displayName: 'State 1',
        description: 'First state',
        settings: { theme: 'blue' },
        sortOrder: 0,
      });
      expect(result[1]).toEqual({
        displayName: 'State 2',
        description: 'Second state',
        settings: { theme: 'red' },
        sortOrder: 1,
      });
    });

    it('should return empty array when states array is empty', () => {
      const result =
        service.buildCreateInnovationFlowStateInputFromInnovationFlowState([]);

      expect(result).toEqual([]);
    });
  });

  describe('buildCreateInnovationFlowInputFromInnovationFlow', () => {
    it('should throw EntityNotInitializedException when states are missing', () => {
      const innovationFlow = {
        id: 'flow-1',
        states: undefined,
        settings: {},
        profile: { displayName: 'Flow', description: 'desc' },
      } as any;

      expect(() =>
        service.buildCreateInnovationFlowInputFromInnovationFlow(
          innovationFlow
        )
      ).toThrow(EntityNotInitializedException);
    });

    it('should throw EntityNotInitializedException when settings are missing', () => {
      const innovationFlow = {
        id: 'flow-1',
        states: [],
        settings: undefined,
        profile: { displayName: 'Flow', description: 'desc' },
      } as any;

      expect(() =>
        service.buildCreateInnovationFlowInputFromInnovationFlow(
          innovationFlow
        )
      ).toThrow(EntityNotInitializedException);
    });

    it('should throw EntityNotInitializedException when profile is missing', () => {
      const innovationFlow = {
        id: 'flow-1',
        states: [],
        settings: {},
        profile: undefined,
      } as any;

      expect(() =>
        service.buildCreateInnovationFlowInputFromInnovationFlow(
          innovationFlow
        )
      ).toThrow(EntityNotInitializedException);
    });

    it('should set currentStateDisplayName from matching state', () => {
      const states = [
        { id: 'state-1', displayName: 'Active', description: '', settings: {}, sortOrder: 0 },
        { id: 'state-2', displayName: 'Closed', description: '', settings: {}, sortOrder: 1 },
      ];
      const innovationFlow = {
        id: 'flow-1',
        states,
        settings: {},
        profile: { displayName: 'Flow', description: 'desc' },
        currentStateID: 'state-2',
      } as any;

      const result =
        service.buildCreateInnovationFlowInputFromInnovationFlow(
          innovationFlow
        );

      expect(result.currentStateDisplayName).toBe('Closed');
    });

    it('should set currentStateDisplayName to empty string when no matching state found', () => {
      const states = [
        { id: 'state-1', displayName: 'Active', description: '', settings: {}, sortOrder: 0 },
      ];
      const innovationFlow = {
        id: 'flow-1',
        states,
        settings: {},
        profile: { displayName: 'Flow', description: 'desc' },
        currentStateID: 'nonexistent',
      } as any;

      const result =
        service.buildCreateInnovationFlowInputFromInnovationFlow(
          innovationFlow
        );

      expect(result.currentStateDisplayName).toBe('');
    });
  });

  describe('buildCreateWhiteboardInputFromWhiteboard', () => {
    it('should return undefined when whiteboard is undefined', () => {
      const result =
        service.buildCreateWhiteboardInputFromWhiteboard(undefined);

      expect(result).toBeUndefined();
    });

    it('should return create input with profile, content, nameID, and previewSettings', () => {
      const whiteboard = {
        profile: {
          displayName: 'My Board',
          description: 'desc',
        },
        content: '{"data":"test"}',
        nameID: 'my-board',
        previewSettings: { zoom: 1 },
      } as any;

      const result =
        service.buildCreateWhiteboardInputFromWhiteboard(whiteboard);

      expect(result).toBeDefined();
      expect(result!.content).toBe('{"data":"test"}');
      expect(result!.nameID).toBe('my-board');
      expect(result!.previewSettings).toEqual({ zoom: 1 });
    });
  });

  describe('buildCreateMemoInputFromMemo', () => {
    it('should throw EntityNotInitializedException when memo profile is missing', () => {
      const memo = { id: 'memo-1', profile: undefined } as any;

      expect(() => service.buildCreateMemoInputFromMemo(memo)).toThrow(
        EntityNotInitializedException
      );
    });

    it('should return create input with nameID and profile when content is undefined', () => {
      const memo = {
        id: 'memo-1',
        nameID: 'test-memo',
        content: undefined,
        profile: {
          displayName: 'Test Memo',
          description: 'A memo',
        },
      } as any;

      const result = service.buildCreateMemoInputFromMemo(memo);

      expect(result.nameID).toBe('test-memo');
      expect(result.markdown).toBeUndefined();
    });
  });

  describe('buildCreateProfileInputFromProfile', () => {
    it('should throw EntityNotInitializedException when profile is falsy', () => {
      expect(() =>
        service.buildCreateProfileInputFromProfile(undefined as any)
      ).toThrow(EntityNotInitializedException);
    });

    it('should map profile fields including displayName, description, and tagline', () => {
      const profile = {
        displayName: 'My Profile',
        description: 'Profile desc',
        tagline: 'A tagline',
        location: undefined,
        references: undefined,
        tagsets: undefined,
        visuals: undefined,
      } as any;

      const result = service.buildCreateProfileInputFromProfile(profile);

      expect(result.displayName).toBe('My Profile');
      expect(result.description).toBe('Profile desc');
      expect(result.tagline).toBe('A tagline');
      expect(result.location).toBeUndefined();
      expect(result.referencesData).toEqual([]);
      expect(result.tagsets).toEqual([]);
      expect(result.visuals).toEqual([]);
    });
  });

  describe('buildCreateTagsetsInputFromTagsets', () => {
    it('should return empty array when tagsets is undefined', () => {
      const result = service.buildCreateTagsetsInputFromTagsets(undefined);
      expect(result).toEqual([]);
    });

    it('should map tagsets preserving name, tags, type, and tagsetTemplate', () => {
      const tagsets = [
        {
          name: 'skills',
          tags: ['typescript', 'nestjs'],
          type: 'FREEFORM',
          tagsetTemplate: { id: 'tpl-1' },
        },
      ] as any[];

      const result = service.buildCreateTagsetsInputFromTagsets(tagsets);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'skills',
        tags: ['typescript', 'nestjs'],
        type: 'FREEFORM',
        tagsetTemplate: { id: 'tpl-1' },
      });
    });
  });

  describe('buildCreateSpaceAboutInputFromSpaceAbout', () => {
    it('should include guidelines when present on spaceAbout', () => {
      const spaceAbout = {
        profile: { displayName: 'Space', description: 'desc' },
        who: 'Everyone',
        why: 'Collaboration',
        guidelines: {
          profile: { displayName: 'Guidelines', description: 'rules' },
        },
      } as any;

      const result =
        service.buildCreateSpaceAboutInputFromSpaceAbout(spaceAbout);

      expect(result.guidelines).toBeDefined();
      expect(result.who).toBe('Everyone');
      expect(result.why).toBe('Collaboration');
    });

    it('should set guidelines to undefined when not present on spaceAbout', () => {
      const spaceAbout = {
        profile: { displayName: 'Space', description: 'desc' },
        who: 'Everyone',
        why: 'Collaboration',
        guidelines: undefined,
      } as any;

      const result =
        service.buildCreateSpaceAboutInputFromSpaceAbout(spaceAbout);

      expect(result.guidelines).toBeUndefined();
    });
  });

  describe('buildCreateCalloutsSetInputFromCalloutsSet', () => {
    it('should throw RelationshipNotFoundException when callouts are missing', async () => {
      const calloutsSet = { id: 'cs-1', callouts: undefined } as any;

      await expect(
        service.buildCreateCalloutsSetInputFromCalloutsSet(calloutsSet)
      ).rejects.toThrow(RelationshipNotFoundException);
    });
  });

  describe('buildCreateCollaborationInputFromCollaboration', () => {
    it('should throw RelationshipNotFoundException when collaboration is missing calloutsSet', async () => {
      vi.mocked(collaborationService.getCollaborationOrFail).mockResolvedValue({
        id: 'collab-1',
        calloutsSet: undefined,
        innovationFlow: { states: [] },
      });

      await expect(
        service.buildCreateCollaborationInputFromCollaboration('collab-1')
      ).rejects.toThrow(RelationshipNotFoundException);
    });
  });
});
