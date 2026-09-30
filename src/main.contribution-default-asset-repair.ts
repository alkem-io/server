import './config/aliases';
import { NestFactory } from '@nestjs/core';
import { parseRepairCommand } from './tools/contribution-default-asset-repair/repair.command';

export const run = async (
  command = parseRepairCommand(process.argv.slice(2))
): Promise<number> => {
  const { ContributionDefaultAssetRepairWorkerModule } = await import(
    './tools/contribution-default-asset-repair/contribution.default.asset.repair.worker.module'
  );
  const { ContributionDefaultAssetRepairService } = await import(
    './tools/contribution-default-asset-repair/contribution.default.asset.repair.service'
  );
  const app = await NestFactory.createApplicationContext(
    ContributionDefaultAssetRepairWorkerModule,
    { logger: false, abortOnError: false }
  );
  try {
    const execution = await app
      .get(ContributionDefaultAssetRepairService)
      .execute(command);
    process.stdout.write(`${JSON.stringify(execution.result)}\n`);
    return execution.ok ? 0 : 1;
  } finally {
    await app.close();
  }
};

const failureLine = '{"ok":false,"reason":"failed"}\n';

export const main = async (
  execute: () => Promise<number> = run,
  output: { write(value: string): unknown } = process.stdout
): Promise<void> => {
  try {
    process.exitCode = await execute();
  } catch {
    output.write(failureLine);
    process.exitCode = 1;
  }
};

if (require.main === module) {
  void main();
}
