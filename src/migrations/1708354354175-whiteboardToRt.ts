import { MigrationInterface, QueryRunner } from 'typeorm';
import { escapeString } from './utils/escape-string';
import { inflate } from 'zlib';
import { promisify } from 'util';

// We can't rely on default "utf8" because Buffer#toString() alters strings that aren't valid UTF-8
// as well as we shouldn't use "base64" because it's space-consuming and we're trying to save space here.
const COMPRESSED_STRING_ENCODING = 'binary';

export const decompressText = async (value: string): Promise<string> => {
  const compressedBuffer = Buffer.from(value, COMPRESSED_STRING_ENCODING);
  const decompressedBuffer = await promisify(inflate)(compressedBuffer);

  return decompressedBuffer.toString('utf8');
};

type Whiteboard = {
  id: string;
  createdDate: Date;
  updatedDate: Date;
  version: number;
  content: string;
  authorizationId: string;
  checkoutId: string;
  nameID: string;
  createdBy: string;
  profileId: string;
};

export class whiteboardToRt1708354354175 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // decompress all records in the whiteboard_rt
    const whiteboardsRt: Whiteboard[] = await queryRunner.query(`
      SELECT * FROM whiteboard
    `);
    for (const whiteboardRt of whiteboardsRt) {
      whiteboardRt.content = await decompressText(whiteboardRt.content);
      await queryRunner.query(`
        UPDATE whiteboard_rt
        SET content = '${whiteboardRt.content}'
        WHERE id = '${whiteboardRt.id}'
      `);
    }
    // move whiteboards to whiteboard_rt AND decompress the content
    const whiteboards: Whiteboard[] = await queryRunner.query(`
      SELECT * FROM whiteboard
    `);
    for (const whiteboard of whiteboards) {
      whiteboard.content = await decompressText(whiteboard.content);
      const debugValue = generateInsertValues(whiteboard);
      await queryRunner.query(`
        INSERT INTO whiteboard_rt (id, createdDate, updatedDate, version, nameID, content, createdBy, authorizationId, profileId, contentUpdatePolicy)
        VALUES
        ${debugValue}
      `);
    }
    // delete checkout entity
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP FOREIGN KEY \`FK_08d1ccc94b008dbda894a3cfa20\`` // whiteboard_checkout.id
    );
    await queryRunner.query(
      `DROP INDEX \`REL_08d1ccc94b008dbda894a3cfa2\` ON \`whiteboard\`` // whiteboard_checkout.id
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP INDEX \`IDX_08d1ccc94b008dbda894a3cfa2\`` // whiteboard_checkout.id
    );
    await queryRunner.query(`DROP TABLE whiteboard_checkout`);
    // migrate framing whiteboardRtId to whiteboardId and drop whiteboardRtId
    // this way no rename is needed and FK conflicts are avoided
    // drop fk constraint and add it later
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP FOREIGN KEY \`FK_8bc0e1f40be5816d3a593cbf7fa\`` // whiteboardId
    );
    await queryRunner.query(`
      UPDATE callout_framing SET whiteboardId = whiteboardRtId
      WHERE whiteboardRtId IS NOT NULL
    `);
    // drop framing.whiteboardRtId
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP FOREIGN KEY \`FK_62712f63939a6d56fd5c334ee3f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP INDEX \`IDX_62712f63939a6d56fd5c334ee3\``
    );
    await queryRunner.query(
      `ALTER TABLE callout_framing DROP COLUMN whiteboardRtId`
    );
    // drop callout_contribution references to whiteboard table
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP FOREIGN KEY \`FK_5e34f9a356f6254b8da24f8947b\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_5e34f9a356f6254b8da24f8947\` ON \`callout_contribution\``
    );
    // drop whiteboard table
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP FOREIGN KEY \`FK_29991450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP FOREIGN KEY \`FK_1dc9521a013c92854e92e099335\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_1dc9521a013c92854e92e09933\` ON \`whiteboard\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP INDEX \`IDX_1dc9521a013c92854e92e09933\``
    );
    await queryRunner.query(`DROP TABLE whiteboard`);
    // rename whiteboard_rt to whiteboard
    await queryRunner.query(`ALTER TABLE whiteboard_rt RENAME TO whiteboard`);
    // reinsert callout_contribution references to the newly renamed whiteboard table
    await queryRunner.query(`
      ALTER TABLE \`callout_contribution\` ADD CONSTRAINT \`FK_5e34f9a356f6254b8da24f8947b\`
        FOREIGN KEY (\`whiteboardId\`) REFERENCES \`whiteboard\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE \`callout_contribution\` ADD UNIQUE INDEX \`REL_5e34f9a356f6254b8da24f8947\` (\`whiteboardId\`)
    `);
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD CONSTRAINT \`FK_8bc0e1f40be5816d3a593cbf7fa\` FOREIGN KEY (\`whiteboardId\`) REFERENCES \`whiteboard\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP FOREIGN KEY \`FK_8bc0e1f40be5816d3a593cbf7fa\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP INDEX \`REL_5e34f9a356f6254b8da24f8947\``
    );
  }
}

const generateInsertValues = (whiteboard: Whiteboard) => {
  return `(
    '${whiteboard.id}',
    '${dateToMysqlDatetime(correctDate(whiteboard.createdDate))}',
    '${dateToMysqlDatetime(correctDate(whiteboard.updatedDate))}',
     ${whiteboard.version},
     '${whiteboard.nameID}',
     '${escapeString(whiteboard.content)}',
     '${whiteboard.createdBy}',
     '${whiteboard.authorizationId}',
     '${whiteboard.profileId}',
      'admins'
    )`;
};
// corrects the date object, changed after parsing the date from the database by typeorm
// the date in db looks like '2023-12-01 10:10:39.725124', but is parsed as '2023-12-01T08:10:39'
// this function parses it to '2023-12-01T10:10:39.725Z'
const correctDate = (date: Date) => {
  date.setTime(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return date;
};

const dateToMysqlDatetime = (date: Date) => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}
