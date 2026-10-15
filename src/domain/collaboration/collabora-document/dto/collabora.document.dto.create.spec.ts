import { CollaboraDocumentType } from '@common/enums/collabora.document.type';
import { validate } from 'class-validator';
import { CreateCollaboraDocumentInput } from './collabora.document.dto.create';

describe('CreateCollaboraDocumentInput', () => {
  describe('documentType validation (@IsEnum(CollaboraDocumentType))', () => {
    it.each(
      Object.values(CollaboraDocumentType)
    )('accepts %s as a valid documentType', async documentType => {
      const input = new CreateCollaboraDocumentInput();
      input.displayName = 'Report';
      input.documentType = documentType;

      const errors = await validate(input);

      expect(errors).toHaveLength(0);
    });

    it('accepts PDF specifically with no DTO change needed', async () => {
      const input = new CreateCollaboraDocumentInput();
      input.displayName = 'Report';
      input.documentType = CollaboraDocumentType.PDF;

      const errors = await validate(input);

      expect(errors).toHaveLength(0);
    });

    it('rejects a documentType value outside the enum', async () => {
      const input = new CreateCollaboraDocumentInput();
      input.displayName = 'Report';
      // Simulates a malformed/unsupported value arriving over the wire.
      (input as any).documentType = 'not-a-real-type';

      const errors = await validate(input);

      expect(errors.some(error => error.property === 'documentType')).toBe(
        true
      );
    });

    it('allows documentType to be omitted (ignored on the upload path)', async () => {
      const input = new CreateCollaboraDocumentInput();
      input.displayName = 'Report';

      const errors = await validate(input);

      expect(errors).toHaveLength(0);
    });
  });

  describe('sourceCollaboraDocumentID validation (@IsOptional @IsUUID)', () => {
    it('accepts a valid UUID', async () => {
      const input = new CreateCollaboraDocumentInput();
      input.sourceCollaboraDocumentID = '3f2b7c1e-5a4d-4e6b-9c8a-1d2e3f4a5b6c';

      const errors = await validate(input);

      expect(errors).toHaveLength(0);
    });

    it('rejects a non-UUID value', async () => {
      const input = new CreateCollaboraDocumentInput();
      input.sourceCollaboraDocumentID = 'not-a-uuid';

      const errors = await validate(input);

      expect(
        errors.some(error => error.property === 'sourceCollaboraDocumentID')
      ).toBe(true);
    });

    it('allows sourceCollaboraDocumentID to be omitted', async () => {
      const input = new CreateCollaboraDocumentInput();
      input.displayName = 'Report';

      const errors = await validate(input);

      expect(errors).toHaveLength(0);
    });
  });
});
