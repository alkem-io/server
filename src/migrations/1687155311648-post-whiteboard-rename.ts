import { MigrationInterface, QueryRunner } from 'typeorm';

export class postWhiteboardRename1686376509726 implements MigrationInterface {
  name = 'postWhiteboardRename1686376509726';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove FKs on Canvas entity + rename

    // Aspect ==> authorization
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY FK_00a8c330495ef844bfc6975ec89;`
    );
    // Aspect ==> Callout
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_deceb07e75a8600e38d5de14a89\``
    );
    // Aspect ==> Room
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_c4fb636888fc391cf1d7406e891\``
    );
    // Aspect ==> Profile
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_67663901817dd09d5906537e088\``
    );

    // Canvas ==> Authorization
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_1dc9521a013c92854e92e099335\``
    );

    // Canvas ==> Callout
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_fcabc1f3aa38aca70df4f66e938\``
    );
    // Canvas ==> checkout
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_08d1ccc94b008dbda894a3cfa20\``
    );
    // Canvas ==> Profile
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_29991450cf75dc486700ca034c6\``
    );

    // CanvasCheckout ==> Authorization
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` DROP FOREIGN KEY \`FK_353b042af56f01ce222f08abf49\``
    );

    // CanvasCheckout ==> Lifecycle
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` DROP FOREIGN KEY \`FK_bd3c7c6c2dbc2a8daf4b1500a69\``
    );

    ///// Do the renaming :)
    await queryRunner.query('ALTER TABLE aspect RENAME TO post');
    await queryRunner.query('ALTER TABLE canvas RENAME TO whiteboard');
    await queryRunner.query(
      'ALTER TABLE canvas_checkout RENAME TO whiteboard_checkout'
    );

    await queryRunner.query(
      `ALTER TABLE \`whiteboard_checkout\` RENAME COLUMN \`canvasId\` TO \`whiteboardId\``
    );

    await queryRunner.query(
      `ALTER TABLE \`post\` ADD CONSTRAINT FK_00a8c330495ef844bfc6975ec89 FOREIGN KEY (authorizationId) REFERENCES authorization_policy(id) ON DELETE SET NULL;`
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` ADD CONSTRAINT \`FK_deceb07e75a8600e38d5de14a89\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` ADD CONSTRAINT \`FK_c4fb636888fc391cf1d7406e891\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` ADD CONSTRAINT \`FK_67663901817dd09d5906537e088\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD CONSTRAINT \`FK_1dc9521a013c92854e92e099335\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD CONSTRAINT \`FK_fcabc1f3aa38aca70df4f66e938\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD CONSTRAINT \`FK_08d1ccc94b008dbda894a3cfa20\` FOREIGN KEY (\`checkoutId\`) REFERENCES \`whiteboard_checkout\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD CONSTRAINT \`FK_29991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`whiteboard_checkout\` ADD CONSTRAINT \`FK_353b042af56f01ce222f08abf49\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_checkout\` ADD CONSTRAINT \`FK_bd3c7c6c2dbc2a8daf4b1500a69\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Update existing activity entries to set the type properly
    const activities: { id: string; type: string }[] = await queryRunner.query(
      `SELECT id, type FROM activity`
    );
    for (const activity of activities) {
      const newType = activity.type
        .replace('canvas', 'whiteboard')
        .replace('card', 'post');
      await queryRunner.query(
        `UPDATE activity SET type='${newType}' WHERE id='${activity.id}'`
      );
    }

    // Update existing callouts to set the type properly
    const callouts: { id: string; type: string }[] = await queryRunner.query(
      `SELECT id, type FROM callout`
    );
    for (const callout of callouts) {
      const newType = callout.type
        .replace('canvas', 'whiteboard-collection')
        .replace('single-whiteboard', 'whiteboard')
        .replace('card', 'post-collection')
        .replace('comments', 'post');
      await queryRunner.query(
        `UPDATE callout SET type='${newType}' WHERE id='${callout.id}'`
      );
    }

    // Update the preferences
    const preference_definitions: {
      id: string;
      type: string;
      displayName: string;
      description: string;
      definitionSet: string;
      groupName: string;
    }[] = await queryRunner.query(
      `SELECT id, type, displayName, description, definitionSet, groupName FROM preference_definition`
    );
    for (const definition of preference_definitions) {
      const newType = definition.type
        .replace('Aspect', 'Post')
        .replace('Canvas', 'Whiteboard')
        .replace('Hxb', 'Space');
      const newDisplayName = definition.displayName
        .replace('aspect', 'Post')
        .replace('Canvas', 'Whiteboard')
        .replace('Hxb', 'Space');
      const newDescription = definition.description
        .replace('aspect', 'Post')
        .replace('Canvas', 'Whiteboard')
        .replace('Hxb', 'Space');
      const newDefinitionSet = definition.definitionSet.replace('hxb', 'space');
      const newGroupName = definition.groupName.replace('Hxb', 'Space');
      await queryRunner.query(
        `UPDATE preference_definition SET type='${newType}', displayName='${newDisplayName}', description='${newDescription}', definitionSet='${newDefinitionSet}', groupName='${newGroupName}' WHERE id='${definition.id}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove FKs on Canvas entity + rename

    // Aspect ==> authorization
    await queryRunner.query(
      `ALTER TABLE \`post\` DROP FOREIGN KEY FK_00a8c330495ef844bfc6975ec89;`
    );
    // Aspect ==> Callout
    await queryRunner.query(
      `ALTER TABLE \`post\` DROP FOREIGN KEY \`FK_deceb07e75a8600e38d5de14a89\``
    );
    // Aspect ==> Room
    await queryRunner.query(
      `ALTER TABLE \`post\` DROP FOREIGN KEY \`FK_c4fb636888fc391cf1d7406e891\``
    );
    // Aspect ==> Profile
    await queryRunner.query(
      `ALTER TABLE \`post\` DROP FOREIGN KEY \`FK_67663901817dd09d5906537e088\``
    );

    // Canvas ==> Authorization
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP FOREIGN KEY \`FK_1dc9521a013c92854e92e099335\``
    );

    // Canvas ==> Callout
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP FOREIGN KEY \`FK_fcabc1f3aa38aca70df4f66e938\``
    );
    // Canvas ==> checkout
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP FOREIGN KEY \`FK_08d1ccc94b008dbda894a3cfa20\``
    );
    // Canvas ==> Profile
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP FOREIGN KEY \`FK_29991450cf75dc486700ca034c6\``
    );

    // CanvasCheckout ==> Authorization
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_checkout\` DROP FOREIGN KEY \`FK_353b042af56f01ce222f08abf49\``
    );

    // CanvasCheckout ==> Lifecycle
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_checkout\` DROP FOREIGN KEY \`FK_bd3c7c6c2dbc2a8daf4b1500a69\``
    );

    ///// Do the renaming :)
    await queryRunner.query('ALTER TABLE post RENAME TO aspect');
    await queryRunner.query('ALTER TABLE whiteboard RENAME TO canvas');
    await queryRunner.query(
      'ALTER TABLE whiteboard_checkout RENAME TO canvas_checkout'
    );

    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` RENAME COLUMN \`whiteboardId\` TO \`canvasId\``
    );

    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD CONSTRAINT FK_00a8c330495ef844bfc6975ec89 FOREIGN KEY (authorizationId) REFERENCES authorization_policy(id) ON DELETE SET NULL;`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_deceb07e75a8600e38d5de14a89\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_c4fb636888fc391cf1d7406e891\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_67663901817dd09d5906537e088\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD CONSTRAINT \`FK_1dc9521a013c92854e92e099335\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD CONSTRAINT \`FK_fcabc1f3aa38aca70df4f66e938\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD CONSTRAINT \`FK_08d1ccc94b008dbda894a3cfa20\` FOREIGN KEY (\`checkoutId\`) REFERENCES \`canvas_checkout\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD CONSTRAINT \`FK_29991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` ADD CONSTRAINT \`FK_353b042af56f01ce222f08abf49\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` ADD CONSTRAINT \`FK_bd3c7c6c2dbc2a8daf4b1500a69\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Update existing activity entries to set the type properly
    const activities: { id: string; type: string }[] = await queryRunner.query(
      `SELECT id, type FROM activity`
    );
    for (const activity of activities) {
      const newType = activity.type
        .replace('whiteboard', 'canvas')
        .replace('post', 'card');
      await queryRunner.query(
        `UPDATE activity SET type='${newType}' WHERE id='${activity.id}'`
      );
    }

    // Update existing callouts to set the type properly
    const callouts: { id: string; type: string }[] = await queryRunner.query(
      `SELECT id, type FROM callout`
    );
    for (const callout of callouts) {
      const newType = callout.type
        .replace('whiteboard-collection', 'canvas')
        .replace('whiteboard', 'single-whiteboard')
        .replace('post-collection', 'card')
        .replace('post', 'comments');
      await queryRunner.query(
        `UPDATE callout SET type='${newType}' WHERE id='${callout.id}'`
      );
    }

    // Update the preferences
    const preference_definitions: {
      id: string;
      type: string;
      displayName: string;
      description: string;
      definitionSet: string;
      groupName: string;
    }[] = await queryRunner.query(
      `SELECT id, type, displayName, description, definitionSet, groupName FROM preference_definition`
    );
    for (const definition of preference_definitions) {
      const newType = definition.type
        .replace('Post', 'Aspect')
        .replace('Whiteboard', 'Canvas')
        .replace('Space', 'Hxb');
      const newDisplayName = definition.displayName
        .replace('Post', 'aspect')
        .replace('Whiteboard', 'Canvas')
        .replace('Space', 'Hxb');
      const newDescription = definition.description
        .replace('Post', 'aspect')
        .replace('Whiteboard', 'Canvas')
        .replace('Space', 'Hxb');
      const newDefinitionSet = definition.definitionSet.replace('space', 'hxb');
      const newGroupName = definition.groupName.replace('Space', 'Hxb');
      await queryRunner.query(
        `UPDATE preference_definition SET type='${newType}', displayName='${newDisplayName}', description='${newDescription}', definitionSet='${newDefinitionSet}', groupName='${newGroupName}' WHERE id='${definition.id}'`
      );
    }
  }
}
