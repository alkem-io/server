import { IInnovationFlow } from '@domain/collaboration/innovation-flow/innovation.flow.interface';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovation.flow.service';
import { IInnovationFlowState } from '@domain/collaboration/innovation-flow-state/innovation.flow.state.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { InnovationFlowResolverFields } from './innovation.flow.resolver.fields';

function makeState(id: string, sortOrder: number): IInnovationFlowState {
  return { id, sortOrder } as unknown as IInnovationFlowState;
}

function makeFlow(
  id: string,
  states?: IInnovationFlowState[],
  currentStateID?: string
): IInnovationFlow {
  return { id, states, currentStateID } as unknown as IInnovationFlow;
}

describe('InnovationFlowResolverFields', () => {
  let resolver: InnovationFlowResolverFields;
  let innovationFlowService: Mocked<InnovationFlowService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InnovationFlowResolverFields, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<InnovationFlowResolverFields>(
      InnovationFlowResolverFields
    );
    innovationFlowService = module.get<InnovationFlowService>(
      InnovationFlowService
    ) as Mocked<InnovationFlowService>;
  });

  describe('states', () => {
    it('should return eagerly-loaded states sorted by sortOrder', async () => {
      const s1 = makeState('s-1', 2);
      const s2 = makeState('s-2', 1);
      const flow = makeFlow('flow-1', [s1, s2]);

      const result = await resolver.states(flow);

      expect(result).toEqual([s2, s1]);
      expect(innovationFlowService.getStates).not.toHaveBeenCalled();
    });

    it('should delegate to service when states are undefined', async () => {
      const flow = makeFlow('flow-1', undefined);
      const serviceStates = [makeState('s-1', 1)];
      innovationFlowService.getStates.mockResolvedValue(serviceStates);

      const result = await resolver.states(flow);

      expect(result).toEqual(serviceStates);
      expect(innovationFlowService.getStates).toHaveBeenCalledWith('flow-1');
    });

    it('should delegate to service when states is empty array', async () => {
      const flow = makeFlow('flow-1', []);
      const serviceStates = [makeState('s-1', 1)];
      innovationFlowService.getStates.mockResolvedValue(serviceStates);

      const result = await resolver.states(flow);

      expect(result).toEqual(serviceStates);
      expect(innovationFlowService.getStates).toHaveBeenCalledWith('flow-1');
    });
  });

  describe('currentState', () => {
    it('should return null when currentStateID is not set', async () => {
      const flow = makeFlow('flow-1', [makeState('s-1', 1)]);

      const result = await resolver.currentState(flow);

      expect(result).toBeNull();
      expect(innovationFlowService.getCurrentState).not.toHaveBeenCalled();
    });

    it('should find matching state from eagerly-loaded states', async () => {
      const s1 = makeState('s-1', 1);
      const s2 = makeState('s-2', 2);
      const flow = makeFlow('flow-1', [s1, s2], 's-2');

      const result = await resolver.currentState(flow);

      expect(result).toBe(s2);
      expect(innovationFlowService.getCurrentState).not.toHaveBeenCalled();
    });

    it('should return null when currentStateID not found in states array', async () => {
      const s1 = makeState('s-1', 1);
      const flow = makeFlow('flow-1', [s1], 's-missing');

      const result = await resolver.currentState(flow);

      expect(result).toBeNull();
    });

    it('should delegate to service when states are not loaded', async () => {
      const flow = makeFlow('flow-1', undefined, 's-1');
      const expectedState = makeState('s-1', 1);
      innovationFlowService.getCurrentState.mockResolvedValue(expectedState);

      const result = await resolver.currentState(flow);

      expect(result).toBe(expectedState);
      expect(innovationFlowService.getCurrentState).toHaveBeenCalledWith('s-1');
    });

    it('should delegate to service when states is empty array with currentStateID set', async () => {
      const flow = makeFlow('flow-1', [], 's-1');
      const expectedState = makeState('s-1', 1);
      innovationFlowService.getCurrentState.mockResolvedValue(expectedState);

      const result = await resolver.currentState(flow);

      expect(result).toBe(expectedState);
      expect(innovationFlowService.getCurrentState).toHaveBeenCalledWith('s-1');
    });
  });
});
