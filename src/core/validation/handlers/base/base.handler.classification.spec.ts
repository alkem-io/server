import { ClassificationCardinality } from '@common/enums/classification.cardinality';
import { ValidationException } from '@common/exceptions';
import { AddClassificationEntryFromTemplateInput } from '@domain/space/classification.entry/dto/classification.entry.dto.add.from.template';
import { CreateClassificationEntryInput } from '@domain/space/classification.entry/dto/classification.entry.dto.create';
import { DeleteClassificationEntryInput } from '@domain/space/classification.entry/dto/classification.entry.dto.delete';
import { UpdateClassificationEntryInput } from '@domain/space/classification.entry/dto/classification.entry.dto.update';
import { UpdateClassificationEntryDisplayInput } from '@domain/space/classification.entry/dto/classification.entry.dto.update.display';
import { UpdateClassificationEntrySelectionInput } from '@domain/space/classification.entry/dto/classification.entry.dto.update.selection';
import { plainToInstance } from 'class-transformer';
import { describe, expect, it } from 'vitest';
import { BaseHandler } from './base.handler';

// sec-server-2: none of the six classification GraphQL input types were
// registered in this handler's opt-in allowlist, so every @MaxLength /
// @ArrayMinSize / @ArrayMaxSize / @ValidateNested decorator declared on
// them never executed. These specs prove the wiring, not just its
// presence — a metatype missing from the allowlist would make every one
// of these pass with rejects.toThrow() never firing, since `validate()` is
// never even called.
describe('BaseHandler — classification DTOs are validated at the pipe (sec-server-2)', () => {
  const handler = new BaseHandler();
  const spaceID = '00000000-0000-0000-0000-000000000001';

  it('rejects an over-length displayLabel on CreateClassificationEntryInput', async () => {
    const value = plainToInstance(CreateClassificationEntryInput, {
      spaceID,
      displayLabel: 'x'.repeat(129),
      cardinality: ClassificationCardinality.MULTI_SELECT,
      values: [{ label: 'A' }],
    });

    await expect(
      handler.handle(value, CreateClassificationEntryInput)
    ).rejects.toThrow(ValidationException);
  });

  it('accepts a displayLabel at exactly the length bound', async () => {
    const value = plainToInstance(CreateClassificationEntryInput, {
      spaceID,
      displayLabel: 'x'.repeat(128),
      cardinality: ClassificationCardinality.MULTI_SELECT,
      values: [{ label: 'A' }],
    });

    await expect(
      handler.handle(value, CreateClassificationEntryInput)
    ).resolves.toBeNull();
  });

  it('rejects an over-size values array on CreateClassificationEntryInput (sec-server-3: the pipe-level cap)', async () => {
    const value = plainToInstance(CreateClassificationEntryInput, {
      spaceID,
      displayLabel: 'Sector',
      cardinality: ClassificationCardinality.MULTI_SELECT,
      values: Array.from({ length: 51 }, (_, i) => ({ label: `Value ${i}` })),
    });

    await expect(
      handler.handle(value, CreateClassificationEntryInput)
    ).rejects.toThrow(ValidationException);
  });

  it('rejects an over-length label nested inside CreateClassificationEntryInput.values (@ValidateNested is wired)', async () => {
    const value = plainToInstance(CreateClassificationEntryInput, {
      spaceID,
      displayLabel: 'Sector',
      cardinality: ClassificationCardinality.MULTI_SELECT,
      values: [{ label: 'x'.repeat(129) }],
    });

    await expect(
      handler.handle(value, CreateClassificationEntryInput)
    ).rejects.toThrow(ValidationException);
  });

  it('rejects an over-size selectedValueIDs on CreateClassificationEntryInput (sec-server-4)', async () => {
    const value = plainToInstance(CreateClassificationEntryInput, {
      spaceID,
      displayLabel: 'Sector',
      cardinality: ClassificationCardinality.MULTI_SELECT,
      values: [{ label: 'A' }],
      selectedValueIDs: Array.from({ length: 51 }, (_, i) => `v${i}`),
    });

    await expect(
      handler.handle(value, CreateClassificationEntryInput)
    ).rejects.toThrow(ValidationException);
  });

  it('rejects an over-size values array on UpdateClassificationEntryInput', async () => {
    const value = plainToInstance(UpdateClassificationEntryInput, {
      classificationEntryID: spaceID,
      values: Array.from({ length: 51 }, (_, i) => ({ label: `Value ${i}` })),
    });

    await expect(
      handler.handle(value, UpdateClassificationEntryInput)
    ).rejects.toThrow(ValidationException);
  });

  it('rejects an over-size selectedValueIDs on UpdateClassificationEntrySelectionInput (sec-server-4)', async () => {
    const value = plainToInstance(UpdateClassificationEntrySelectionInput, {
      classificationEntryID: spaceID,
      selectedValueIDs: Array.from({ length: 51 }, (_, i) => `v${i}`),
    });

    await expect(
      handler.handle(value, UpdateClassificationEntrySelectionInput)
    ).rejects.toThrow(ValidationException);
  });

  it('rejects an over-length displayLabel override on AddClassificationEntryFromTemplateInput', async () => {
    const value = plainToInstance(AddClassificationEntryFromTemplateInput, {
      spaceID,
      templateID: spaceID,
      displayLabel: 'x'.repeat(129),
    });

    await expect(
      handler.handle(value, AddClassificationEntryFromTemplateInput)
    ).rejects.toThrow(ValidationException);
  });

  // The sixth allowlisted metatype, DeleteClassificationEntryInput, is
  // deliberately NOT exercised here: it extends DeleteBaseAlkemioInput,
  // whose `ID` is a GraphQL UUID scalar with zero class-validator
  // constraints — with nothing to reject, an allowlisted and a skipped
  // metatype are observationally identical at the pipe, so a "rejects"
  // case would assert nothing. Malformed delete ids are rejected by the
  // UUID scalar at parse time and by getClassificationEntryOrFail at
  // resolution time instead.
  it('accepts DeleteClassificationEntryInput (no pipe-level constraints to reject)', async () => {
    const value = plainToInstance(DeleteClassificationEntryInput, {
      ID: spaceID,
    });

    await expect(
      handler.handle(value, DeleteClassificationEntryInput)
    ).resolves.toBeNull();
  });

  it('accepts a well-formed UpdateClassificationEntryDisplayInput', async () => {
    const value = plainToInstance(UpdateClassificationEntryDisplayInput, {
      classificationEntryID: spaceID,
      display: false,
    });

    await expect(
      handler.handle(value, UpdateClassificationEntryDisplayInput)
    ).resolves.toBeNull();
  });
});
