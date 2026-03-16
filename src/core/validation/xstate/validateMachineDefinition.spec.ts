import { validateMachineDefinition } from './validateMachineDefinition';

describe('validateMachineDefinition', () => {
  it('should return undefined for valid machine definition', () => {
    const definition = JSON.stringify({
      id: 'test-machine',
      states: {
        idle: {
          on: { START: 'running' },
        },
        running: {
          on: { STOP: 'idle' },
        },
      },
    });

    const result = validateMachineDefinition(definition);

    expect(result).toBeUndefined();
  });

  it('should return undefined for machine with initial state', () => {
    const definition = JSON.stringify({
      id: 'machine',
      initial: 'idle',
      states: {
        idle: {},
      },
    });

    const result = validateMachineDefinition(definition);

    expect(result).toBeUndefined();
  });

  it('should return Error for invalid JSON', () => {
    const result = validateMachineDefinition('{invalid');

    expect(result).toBeInstanceOf(Error);
  });

  it('should return validation errors when id is missing', () => {
    const definition = JSON.stringify({
      states: { idle: {} },
    });

    const result = validateMachineDefinition(definition);

    expect(Array.isArray(result)).toBe(true);
    expect((result as any[]).length).toBeGreaterThan(0);
  });

  it('should return validation errors when states is missing', () => {
    const definition = JSON.stringify({
      id: 'test',
    });

    const result = validateMachineDefinition(definition);

    expect(Array.isArray(result)).toBe(true);
  });

  it('should accept machine with context', () => {
    const definition = JSON.stringify({
      id: 'machine',
      context: { count: 0 },
      states: {
        idle: {},
      },
    });

    const result = validateMachineDefinition(definition);

    expect(result).toBeUndefined();
  });

  it('should accept machine with final states', () => {
    const definition = JSON.stringify({
      id: 'machine',
      states: {
        idle: { on: { FINISH: 'done' } },
        done: { type: 'final' },
      },
    });

    const result = validateMachineDefinition(definition);

    expect(result).toBeUndefined();
  });
});
