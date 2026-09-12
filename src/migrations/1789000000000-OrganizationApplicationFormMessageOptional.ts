import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Relabels the seeded organization application-form question ("What makes
 * you want to join?") as OPTIONAL — it becomes a short optional message
 * field rather than a mandatory gate (FR-011). Every `form` row referenced
 * by an organization's `role_set.applicationFormId` is rewritten in place:
 * the question whose text matches the seed exactly has its `required` flag
 * flipped from `true` to `false`.
 *
 * Idempotent via jsonb containment (`@>`): the guard only matches an
 * element that still has `"required": true`, so a second run finds nothing
 * to rewrite. `down` is an intentional no-op — see the note on the method.
 */
export class OrganizationApplicationFormMessageOptional1789000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE form
      SET questions = (
        SELECT jsonb_agg(
          CASE
            WHEN elem ->> 'question' = 'What makes you want to join?'
            THEN jsonb_set(elem, '{required}', 'false'::jsonb)
            ELSE elem
          END
        )
        FROM jsonb_array_elements(form.questions::jsonb) AS elem
      )::text
      FROM role_set
      WHERE role_set."applicationFormId" = form.id
        AND role_set.type = 'organization'
        AND form.questions::jsonb @> '[{"question":"What makes you want to join?","required":true}]'::jsonb
    `);
  }

  // No automatic rollback: flipping every organization's seed question back
  // to required would re-impose a mandatory field on organizations whose
  // admins may since have edited their form's other content, silently
  // reasserting a state this migration deliberately retired. The key is
  // additive-shaped (a value flip, not a new key) and inert either way, so
  // leaving it costs nothing on a rollback.
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentional no-op. See note above.
  }
}
