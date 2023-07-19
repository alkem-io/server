import { MigrationInterface, QueryRunner } from 'typeorm';

export class whiteboardLifecycleRename1689685090868
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const results: { id: string; machineDef: string }[] =
      await queryRunner.query(`
        SELECT id, machineDef FROM lifecycle where machineDef like '%CanvasCheckinAuthorized%'
      `);

    for (const { id, machineDef } of results) {
      const renamedMachineDef = machineDef
        .replace('CanvasCheckoutAuthorized', 'WhiteboardCheckoutAuthorized')
        .replace('CanvasCheckinAuthorized', 'WhiteboardCheckinAuthorized')
        .replace('canvas-checkout', 'whiteboard-checkout');

      await queryRunner.query(`
          UPDATE lifecycle SET machineDef = '${renamedMachineDef}' WHERE id = '${id}'
        `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const results: { id: string; machineDef: string }[] =
      await queryRunner.query(`
        SELECT id, machineDef FROM lifecycle where machineDef like '%CanvasCheckinAuthorized%'
      `);

    for (const { id, machineDef } of results) {
      const renamedMachineDef = machineDef
        .replace('WhiteboardCheckoutAuthorized', 'CanvasCheckoutAuthorized')
        .replace('WhiteboardCheckinAuthorized', 'CanvasCheckinAuthorized')
        .replace('whiteboard-checkout', 'canvas-checkout');

      await queryRunner.query(`
          UPDATE lifecycle SET machineDef = '${renamedMachineDef}' WHERE id = '${id}'
        `);
    }
  }
}
