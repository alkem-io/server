import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class singleCardCallouts1666714308809 implements MigrationInterface {
  name = 'singleCardCallouts1666714308809';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`cardTemplateId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD UNIQUE INDEX \`IDX_22a2ec1b5bca6c54678ffb19eb\` (\`cardTemplateId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_22a2ec1b5bca6c54678ffb19eb\` ON \`callout\` (\`cardTemplateId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_22a2ec1b5bca6c54678ffb19eb0\` FOREIGN KEY (\`cardTemplateId\`) REFERENCES \`aspect_template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    // callouts with nameID starting with 'card-default'
    const cardDefaultCallouts: { id: string }[] = await queryRunner.query(
      `SELECT id FROM callout WHERE nameID LIKE 'card-default%'`
    );
    for (const callout of cardDefaultCallouts) {
      const cardType = await getSingleCardTypeFromCallout(
        queryRunner,
        callout.id
      );

      if (cardType) {
        // cards are from the same type
        await createSingleCardTypeTemplate(queryRunner, callout.id, cardType);
      } else {
        // cards are from different types
        await createContributionTemplate(queryRunner, callout.id);
      }
    }
    // callouts without any cards & nameID != 'card-default'
    const calloutsWithoutCards: { id: string }[] = await queryRunner.query(`
          SELECT id FROM callout
          WHERE id NOT IN (
            SELECT DISTINCT callout.id AS calloutId FROM aspect
            LEFT JOIN callout ON aspect.calloutId = callout.id
          )
          AND nameID NOT LIKE 'card-default%'
        `);
    // create a card template
    for (const callout of calloutsWithoutCards) {
      await createOtherTemplate(queryRunner, callout.id);
    }
    // select callouts with multiple cards & nameID != 'card-default'
    const multipleCardCallout: { id: string }[] = await queryRunner.query(`
          SELECT id FROM callout
          WHERE id IN (
            SELECT callout.id AS calloutId FROM aspect
            LEFT JOIN callout ON aspect.calloutId = callout.id
          )
          AND nameID NOT LIKE 'card-default%'
        `);
    // run query per callout if all it's cards are the same type
    for (const callout of multipleCardCallout) {
      const cardType = await getSingleCardTypeFromCallout(
        queryRunner,
        callout.id
      );

      if (cardType) {
        await createSingleCardTypeTemplate(queryRunner, callout.id, cardType);
      } else {
        await createOtherTemplate(queryRunner, callout.id);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout\`  DROP FOREIGN KEY \`FK_22a2ec1b5bca6c54678ffb19eb0\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_22a2ec1b5bca6c54678ffb19eb\` ON \`callout\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP INDEX \`IDX_22a2ec1b5bca6c54678ffb19eb\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`cardTemplateId\``
    );
  }
}

const getOtherTemplateVisualUri = async (
  runner: QueryRunner,
  calloutId: string
): Promise<string> =>
  runner
    .query(
      `
        SELECT visual.uri FROM callout
        LEFT JOIN collaboration ON collaboration.id = callout.collaborationId
        LEFT JOIN hub ON hub.collaborationId = collaboration.id
        LEFT JOIN templates_set ON templates_set.id = hub.templatesSetId
        LEFT JOIN aspect_template ON aspect_template.templatesSetId = templates_set.id
        LEFT JOIN template_info ON template_info.id = aspect_template.templateInfoId
        LEFT JOIN visual ON visual.id = template_info.visualId
        WHERE template_info.title = 'other' AND callout.id = '${calloutId}'
        GROUP BY aspect_template.id
    `
    )
    .then(x => x.uri);

const getSingleCardTypeFromCallout = async (
  runner: QueryRunner,
  calloutId: string
): Promise<string | null> => {
  const cardTypes: { type: string }[] = await runner.query(`
        SELECT DISTINCT aspect.type FROM aspect
        LEFT JOIN callout ON aspect.calloutId = callout.id
        where callout.id = '${calloutId}'
    `);
  return cardTypes.length === 1 ? cardTypes[0].type : null;
};

const createTemplate = async (
  runner: QueryRunner,
  calloutId: string,
  type: string,
  defaultDescription: string
) => {
  const otherTemplateVisualUri =
    (await getOtherTemplateVisualUri(runner, calloutId)) ?? '';
  const tagsetId = randomUUID();
  await runner.query(`
        INSERT INTO tagset (id, version, tags)
        VALUES ('${tagsetId}', 1, '')
    `);
  const visualId = randomUUID();
  await runner.query(`
        INSERT INTO visual (id, version, name, uri, minWidth, maxWidth, minHeight, maxHeight, aspectRatio, allowedTypes)
        VALUES ('${visualId}', 1, 'bannerNarrow', '${otherTemplateVisualUri}', 192, 384, 32, 128, 3, 'image/png,image/jpeg,image/jpg,image/svg+xml')
    `);
  const templateInfoId = randomUUID();
  await runner.query(`
        INSERT INTO template_info (id, version, title, description, tagsetId, visualId)
        VALUES ('${templateInfoId}', 1, '', '', '${tagsetId}', '${visualId}')
    `);
  const aspectTemplateId = randomUUID();
  await runner.query(`
        INSERT INTO aspect_template (id, version, templateInfoId, type, defaultDescription)
        VALUES ('${aspectTemplateId}', 1, '${templateInfoId}', '${type}', '${defaultDescription}')
    `);
  await runner.query(`
        UPDATE callout SET cardTemplateId = '${aspectTemplateId}'
        WHERE callout.id = '${calloutId}'
    `);
};

const createContributionTemplate = (runner: QueryRunner, calloutId: string) =>
  createTemplate(
    runner,
    calloutId,
    'contribution',
    'Please share your contribution. The more details the better!'
  );

const createOtherTemplate = (runner: QueryRunner, calloutId: string) =>
  createTemplate(runner, calloutId, 'other', '');

const createSingleCardTypeTemplate = (
  runner: QueryRunner,
  calloutId: string,
  cardType: string
) => createTemplate(runner, calloutId, cardType, '');
