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
});
