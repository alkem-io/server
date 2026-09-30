import './config/aliases';
import { NestFactory } from '@nestjs/core';
import { parseRepairCommand } from './tools/contribution-default-asset-repair/repair.command';

const run = async (): Promise<number> => {
  const command = parseRepairCommand(process.argv.slice(2));
  const { ContributionDefaultAssetRepairWorkerModule } = await import(
    './tools/contribution-default-asset-repair/contribution.default.asset.repair.worker.module'
  );
  const { ContributionDefaultAssetRepairService } = await import(
    './tools/contribution-default-asset-repair/contribution.default.asset.repair.service'
  );
  const app = await NestFactory.createApplicationContext(
    ContributionDefaultAssetRepairWorkerModule,
    { logger: ['error', 'warn', 'log'] }
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

run()
  .then(code => {
    process.exitCode = code;
  })
  .catch(() => {
    process.exitCode = 1;
  });
