import { vi } from 'vitest';

const { mockTransaction, mockApmAgent } = vi.hoisted(() => {
  const mockTransaction = {
    setType: vi.fn(),
    name: '',
    startSpan: vi.fn(),
  };
  const mockApmAgent = {
    currentTransaction: mockTransaction as any,
  };
  return { mockTransaction, mockApmAgent };
});

vi.mock('../apm', () => ({
  apmAgent: mockApmAgent,
}));

import {
  ApmApolloPlugin,
  assignOperationName,
  assignOperationType,
} from './apm.apollo.plugin';

describe('ApmApolloPlugin', () => {
  beforeEach(() => {
    mockTransaction.setType.mockClear();
    mockTransaction.startSpan.mockClear();
    mockTransaction.name = '';
    mockApmAgent.currentTransaction = mockTransaction as any;
  });

  describe('requestDidStart', () => {
    it('should return a request listener object', async () => {
      const listener = await ApmApolloPlugin.requestDidStart!({} as any);
      expect(listener).toBeDefined();
      expect(listener).toHaveProperty('didResolveOperation');
      expect(listener).toHaveProperty('executionDidStart');
    });
  });

  describe('didResolveOperation', () => {
    it('should set transaction type and name from operation', async () => {
      const listener = await ApmApolloPlugin.requestDidStart!({} as any);
      const hooks = listener as any;

      await hooks.didResolveOperation({
        operationName: 'GetUser',
        operation: { operation: 'query' },
      });

      expect(mockTransaction.setType).toHaveBeenCalledWith('query');
      expect(mockTransaction.name).toBe('[query] GetUser');
    });

    it('should use queryHash when operationName is not available', async () => {
      const listener = await ApmApolloPlugin.requestDidStart!({} as any);
      const hooks = listener as any;

      await hooks.didResolveOperation({
        operationName: null,
        queryHash: 'abc123',
        operation: { operation: 'mutation' },
      });

      expect(mockTransaction.setType).toHaveBeenCalledWith('mutation');
      expect(mockTransaction.name).toBe('[mutation] abc123');
    });

    it('should use "unknown type" when operation type is missing', async () => {
      const listener = await ApmApolloPlugin.requestDidStart!({} as any);
      const hooks = listener as any;

      await hooks.didResolveOperation({
        operationName: 'Test',
        operation: undefined,
      });

      expect(mockTransaction.setType).toHaveBeenCalledWith('unknown type');
      expect(mockTransaction.name).toBe('[unknown type] Test');
    });

    it('should return early when no active transaction', async () => {
      mockApmAgent.currentTransaction = null as any;

      const listener = await ApmApolloPlugin.requestDidStart!({} as any);
      const hooks = listener as any;

      await hooks.didResolveOperation({
        operationName: 'GetUser',
        operation: { operation: 'query' },
      });

      expect(mockTransaction.setType).not.toHaveBeenCalled();
    });
  });

  describe('executionDidStart', () => {
    it('should return undefined when global instrumentation is disabled', async () => {
      const listener = await ApmApolloPlugin.requestDidStart!({} as any);
      const hooks = listener as any;

      const result = await hooks.executionDidStart();

      expect(result).toBeUndefined();
    });
  });
});

describe('assignOperationName', () => {
  it('should return operationName when available', () => {
    const result = assignOperationName({
      operationName: 'GetUser',
      queryHash: 'hash123',
    } as any);

    expect(result).toBe('GetUser');
  });

  it('should fall back to queryHash when operationName is null', () => {
    const result = assignOperationName({
      operationName: null,
      queryHash: 'hash123',
    } as any);

    expect(result).toBe('hash123');
  });

  it('should fall back to queryHash when operationName is undefined', () => {
    const result = assignOperationName({
      queryHash: 'hash456',
    } as any);

    expect(result).toBe('hash456');
  });
});

describe('assignOperationType', () => {
  it('should return "query-resolver" for Query type', () => {
    const result = assignOperationType({ name: 'Query' } as any);
    expect(result).toBe('query-resolver');
  });

  it('should return "mutation-resolver" for Mutation type', () => {
    const result = assignOperationType({ name: 'Mutation' } as any);
    expect(result).toBe('mutation-resolver');
  });

  it('should return "subscription-resolver" for Subscription type', () => {
    const result = assignOperationType({ name: 'Subscription' } as any);
    expect(result).toBe('subscription-resolver');
  });

  it('should return "field-resolver" for other types', () => {
    const result = assignOperationType({ name: 'User' } as any);
    expect(result).toBe('field-resolver');
  });
});
