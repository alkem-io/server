import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Form callout framing.
 *
 *  - `callout_form`: the definition of a Form (ordered questions as jsonb plus
 *    the three settings). The owning FK sits on the form (`framingId`, UNIQUE,
 *    ON DELETE CASCADE) so deleting a callout framing removes its Form, and
 *    the response FK below removes every response with it — no delete code.
 *  - `callout_form_response`: one row per submitted response, with the answer
 *    snapshots as jsonb. `createdBy` is SET NULL on account deletion so the
 *    answers are kept without the identity.
 *  - Backfills `space.admin.collaborationCalloutFormResponseReceived` onto
 *    every existing `user_settings` row (additive `jsonb_set` guarded by
 *    `IS NULL`, safely re-runnable).
 *
 * No existing table is altered.
 *
 * Roll-forward-only once a FORM row exists: an older server cannot serialize
 * the `form` value of the non-null CalloutFramingType. Emergency image
 * rollback escape hatch:
 *   UPDATE callout_framing SET type = 'none' WHERE type = 'form';
 * (and back to 'form' afterwards), plus delete the in_app_notification rows of
 * the new notification type.
 */
export class AddCalloutForm1789100000000 implements MigrationInterface {
  name = 'AddCalloutForm1789100000000';

  private static readonly DEFAULT_VALUE = JSON.stringify({
    email: true,
    inApp: true,
    push: true,
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "callout_form" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "version" integer NOT NULL,
        "questions" jsonb NOT NULL,
        "visibility" character varying(128) NOT NULL DEFAULT 'admins',
        "responseMode" character varying(128) NOT NULL DEFAULT 'single',
        "state" character varying(128) NOT NULL DEFAULT 'open',
        "framingId" uuid NOT NULL,
        CONSTRAINT "REL_321286ea3f8efe406a41b70c9b" UNIQUE ("framingId"),
        CONSTRAINT "PK_ffc4704bfd30735a95ffa6bb3cd" PRIMARY KEY ("id")
      )`
    );
    await queryRunner.query(
      `CREATE TABLE "callout_form_response" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "version" integer NOT NULL,
        "rowId" SERIAL NOT NULL,
        "formId" uuid NOT NULL,
        "createdBy" uuid,
        "answers" jsonb NOT NULL,
        CONSTRAINT "PK_f9c98692bcf0b93b84c65963667" PRIMARY KEY ("id")
      )`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_callout_form_response_form_row" ON "callout_form_response" ("formId", "rowId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_callout_form_response_form_created_by" ON "callout_form_response" ("formId", "createdBy")`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_form" ADD CONSTRAINT "FK_321286ea3f8efe406a41b70c9b7" FOREIGN KEY ("framingId") REFERENCES "callout_framing"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_form_response" ADD CONSTRAINT "FK_594363bc5a74480012912b6153f" FOREIGN KEY ("formId") REFERENCES "callout_form"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_form_response" ADD CONSTRAINT "FK_231c7cd00d13308aa091173c984" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Settings backfill: materialize notification.space and
    // notification.space.admin when absent, then add the key only where it is
    // missing. Never touches an existing value.
    await queryRunner.query(
      `
      UPDATE user_settings
      SET notification = jsonb_set(
        jsonb_set(
          jsonb_set(
            notification,
            '{space}'::text[],
            COALESCE(notification -> 'space', '{}'::jsonb),
            true
          ),
          '{space,admin}'::text[],
          COALESCE(notification #> '{space,admin}', '{}'::jsonb),
          true
        ),
        '{space,admin,collaborationCalloutFormResponseReceived}'::text[],
        $1::jsonb,
        true
      )
      WHERE notification #> '{space,admin,collaborationCalloutFormResponseReceived}' IS NULL
      `,
      [AddCalloutForm1789100000000.DEFAULT_VALUE]
    );
  }

  // Drops both tables. The settings key is deliberately left in place: it is
  // additive and inert to older code, and stripping it would discard a
  // recorded choice on the next `up`. Do not run once FORM rows exist unless
  // the callout_framing rows of type 'form' have been parked first (see the
  // class comment).
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "callout_form_response"`);
    await queryRunner.query(`DROP TABLE "callout_form"`);
  }
}
