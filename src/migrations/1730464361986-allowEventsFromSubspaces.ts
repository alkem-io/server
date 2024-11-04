import { MigrationInterface, QueryRunner } from "typeorm";

export class AllowEventsFromSubspaces1730464361986 implements MigrationInterface {
    name = 'AllowEventsFromSubspaces1730464361986'

    public async up(queryRunner: QueryRunner): Promise<void> {
      // defaults to false
      await queryRunner.query(`ALTER TABLE \`calendar_event\` ADD \`visibleOnParentCalendar\` tinyint NOT NULL`);

      const spaceSettings: { id: string, settingsStr: string }[] = await queryRunner.query(`SELECT id, settingsStr FROM alkemio.space;`);

      for (const { id, settingsStr } of spaceSettings) {
        const newSettings = addEventsFromSubspacesSetting(settingsStr);
        await queryRunner.query(`UPDATE alkemio.space SET settingsStr = ? WHERE id = ?`, [newSettings, id]);
      }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`ALTER TABLE \`calendar_event\` DROP COLUMN \`visibleOnParentCalendar\``);

      const spaceSettings: { id: string, settingsStr: string }[] = await queryRunner.query(`SELECT id, settingsStr FROM alkemio.space;`);

      for (const { id, settingsStr } of spaceSettings) {
        const newSettings = removeEventsFromSubspacesSetting(settingsStr);
        await queryRunner.query(`UPDATE alkemio.space SET settingsStr = ? WHERE id = ?`, [newSettings, id]);
      }
    }
}

const addEventsFromSubspacesSetting = (existingSettings: string): string => {
  let settings: ISpaceSettings | undefined;
  try {
    settings = JSON.parse(existingSettings);
  } catch (e) {
    console.error('Error parsing settings JSON:', e);
  }

  if (!settings) {
    return existingSettings;
  }
  // default is true per requirements
  settings.collaboration.allowEventsFromSubspaces = true;

  return JSON.stringify(settings);
}

const removeEventsFromSubspacesSetting = (existingSettings: string): string => {
  let settings: ISpaceSettings | undefined;
  try {
    settings = JSON.parse(existingSettings);
  } catch (e) {
    console.error('Error parsing settings JSON:', e);
  }

  if (!settings) {
    return existingSettings;
  }

  const { allowEventsFromSubspaces, ...rest } = settings.collaboration;
  (settings.collaboration as Omit<ISpaceSettingsCollaboration, 'allowEventsFromSubspaces'>) = rest;

  return JSON.stringify(settings);
}

type ISpaceSettings = {
  // ...rest are not important for this migration
  collaboration: ISpaceSettingsCollaboration;
}


type ISpaceSettingsCollaboration = {
  // ...rest are not important for this migration
  allowEventsFromSubspaces: boolean;
}
