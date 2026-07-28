// T025-F2: Tests for InputObjectTypeDefinition diffing (diff-inputs.ts)
import {
  createDiffContext,
  indexSDL,
} from '../../src/schema-contract/diff/diff-core';
import { diffInputs } from '../../src/schema-contract/diff/diff-inputs';
import { ChangeType } from '../../src/schema-contract/model';

describe('diffInputs — InputObjectTypeDefinition diff (feature 025 fix)', () => {
  it('classifies a new input type as ADDITIVE', () => {
    const oldSDL = 'type Query { ping: String }';
    const newSDL = `type Query { ping: String }
input NewInput { id: ID }`;
    const oldIdx = indexSDL(oldSDL);
    const newIdx = indexSDL(newSDL);
    const ctx = createDiffContext();
    diffInputs(oldIdx, newIdx, ctx);
    expect(
      ctx.entries.some(
        e =>
          e.element === 'NewInput' &&
          e.changeType === ChangeType.ADDITIVE &&
          e.detail.includes('Input type added: NewInput')
      )
    ).toBe(true);
  });

  it('classifies a removed input type as BREAKING', () => {
    const oldSDL = `type Query { ping: String }
input RemovedInput { id: ID }`;
    const newSDL = 'type Query { ping: String }';
    const oldIdx = indexSDL(oldSDL);
    const newIdx = indexSDL(newSDL);
    const ctx = createDiffContext();
    diffInputs(oldIdx, newIdx, ctx);
    expect(
      ctx.entries.some(
        e =>
          e.element === 'RemovedInput' && e.changeType === ChangeType.BREAKING
      )
    ).toBe(true);
  });

  it('classifies a new optional input field on existing type as ADDITIVE', () => {
    const oldSDL = `type Query { ping: String }
input ExistingInput { id: ID }`;
    const newSDL = `type Query { ping: String }
input ExistingInput { id: ID, newField: String }`;
    const oldIdx = indexSDL(oldSDL);
    const newIdx = indexSDL(newSDL);
    const ctx = createDiffContext();
    diffInputs(oldIdx, newIdx, ctx);
    expect(
      ctx.entries.some(
        e =>
          e.element === 'ExistingInput.newField' &&
          e.changeType === ChangeType.ADDITIVE
      )
    ).toBe(true);
  });

  it('classifies a new required input field on existing type as BREAKING', () => {
    const oldSDL = `type Query { ping: String }
input ExistingInput { id: ID }`;
    const newSDL = `type Query { ping: String }
input ExistingInput { id: ID, required: String! }`;
    const oldIdx = indexSDL(oldSDL);
    const newIdx = indexSDL(newSDL);
    const ctx = createDiffContext();
    diffInputs(oldIdx, newIdx, ctx);
    expect(
      ctx.entries.some(
        e =>
          e.element === 'ExistingInput.required' &&
          e.changeType === ChangeType.BREAKING
      )
    ).toBe(true);
  });

  it('classifies a removed input field as BREAKING', () => {
    const oldSDL = `type Query { ping: String }
input ExistingInput { id: ID, gone: String }`;
    const newSDL = `type Query { ping: String }
input ExistingInput { id: ID }`;
    const oldIdx = indexSDL(oldSDL);
    const newIdx = indexSDL(newSDL);
    const ctx = createDiffContext();
    diffInputs(oldIdx, newIdx, ctx);
    expect(
      ctx.entries.some(
        e =>
          e.element === 'ExistingInput.gone' &&
          e.changeType === ChangeType.BREAKING
      )
    ).toBe(true);
  });

  it('detects no change when input type is identical', () => {
    const sdl = `type Query { ping: String }
input SameInput { id: ID, name: String }`;
    const oldIdx = indexSDL(sdl);
    const newIdx = indexSDL(sdl);
    const ctx = createDiffContext();
    diffInputs(oldIdx, newIdx, ctx);
    expect(ctx.entries).toHaveLength(0);
  });

  it('indexes InputObjectTypeDefinition separately from ObjectTypeDefinition', () => {
    const sdl = `type Query { ping: String }
type ObjectType { id: ID }
input InputType { id: ID }`;
    const idx = indexSDL(sdl);
    expect(idx.inputs).toHaveProperty('InputType');
    expect(idx.types).toHaveProperty('ObjectType');
    expect(idx.inputs).not.toHaveProperty('ObjectType');
    expect(idx.types).not.toHaveProperty('InputType');
  });

  it('classifies a new required input field WITH a default value as ADDITIVE', () => {
    const oldSDL = `type Query { ping: String }
input ExistingInput { id: ID }`;
    const newSDL = `type Query { ping: String }
input ExistingInput { id: ID, requiredWithDefault: String! = "x" }`;
    const oldIdx = indexSDL(oldSDL);
    const newIdx = indexSDL(newSDL);
    const ctx = createDiffContext();
    diffInputs(oldIdx, newIdx, ctx);
    expect(
      ctx.entries.some(
        e =>
          e.element === 'ExistingInput.requiredWithDefault' &&
          e.changeType === ChangeType.ADDITIVE
      )
    ).toBe(true);
  });

  it('classifies a required -> optional input field relaxation as INFO (non-breaking)', () => {
    const oldSDL = `type Query { ping: String }
input ExistingInput { id: ID, name: String! }`;
    const newSDL = `type Query { ping: String }
input ExistingInput { id: ID, name: String }`;
    const oldIdx = indexSDL(oldSDL);
    const newIdx = indexSDL(newSDL);
    const ctx = createDiffContext();
    diffInputs(oldIdx, newIdx, ctx);
    const entry = ctx.entries.find(
      e =>
        e.element === 'ExistingInput.name' && e.detail.includes('type changed')
    );
    expect(entry?.changeType).toBe(ChangeType.INFO);
  });

  it('classifies an optional -> required input field tightening as BREAKING', () => {
    const oldSDL = `type Query { ping: String }
input ExistingInput { id: ID, name: String }`;
    const newSDL = `type Query { ping: String }
input ExistingInput { id: ID, name: String! }`;
    const oldIdx = indexSDL(oldSDL);
    const newIdx = indexSDL(newSDL);
    const ctx = createDiffContext();
    diffInputs(oldIdx, newIdx, ctx);
    const entry = ctx.entries.find(
      e =>
        e.element === 'ExistingInput.name' && e.detail.includes('type changed')
    );
    expect(entry?.changeType).toBe(ChangeType.BREAKING);
  });
});
