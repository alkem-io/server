import { MessageAttachmentService } from '@domain/communication/message-attachment/message.attachment.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { AlkemioConfig } from '@src/types';
import { DataSource } from 'typeorm';
import { applyNormalization } from './normalization.apply';
import type { NormalizationCommand } from './normalization.command';
import {
  parseCoverage,
  parseNormalizationCommand,
  parseNormalizationPlan,
  readPrivateEvents,
  readPrivateJson,
  reservePrivateReport,
} from './normalization.command';
import { inventoryNormalization } from './normalization.inventory';
import { LiveNormalizationPort } from './normalization.live';
import type { NormalizationPort } from './normalization.types';

export async function executeNormalization(
  command: NormalizationCommand,
  port: NormalizationPort
): Promise<number> {
  const output = await reservePrivateReport(command.report);
  try {
    if (command.mode === 'inventory') {
      await output.write({
        schemaVersion: 1,
        scope: 'supported-room-inventory',
        roomIds: await port.supportedRooms(),
      });
      return 0;
    }
    if (command.mode === 'dry-run') {
      const events = await readPrivateEvents(command.events);
      const coverage = parseCoverage(
        await readPrivateJson(`${command.events}.coverage.json`)
      );
      const plan = await inventoryNormalization(port, events, coverage);
      await output.write(plan);
      return 0;
    }
    const plan = parseNormalizationPlan(await readPrivateJson(command.plan));
    const result = await applyNormalization(port, plan);
    await output.write(result);
    return result.ok ? 0 : 1;
  } catch {
    await output.write({
      schemaVersion: 1,
      ok: false,
      reason: 'operator_failed',
    });
    return 1;
  } finally {
    await output.close();
  }
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  let app:
    | Awaited<ReturnType<typeof NestFactory.createApplicationContext>>
    | undefined;
  try {
    // Validate CLI before bootstrapping any dependencies. Neither the argv nor
    // framework failures are printed: they may include credentials or text.
    const command = parseNormalizationCommand(args);
    const { NormalizationWorkerModule } = await import(
      './normalization.worker.module'
    );
    app = await NestFactory.createApplicationContext(
      NormalizationWorkerModule,
      { logger: false, abortOnError: false }
    );
    const port = new LiveNormalizationPort(
      app.get(DataSource),
      app.get(MessageAttachmentService),
      app.get(StorageBucketService),
      app.get(FileServiceAdapter),
      app.get<ConfigService<AlkemioConfig, true>>(ConfigService)
    );
    process.exitCode = await executeNormalization(command, port);
    process.stdout.write(
      JSON.stringify({ ok: process.exitCode === 0, mode: command.mode }) + '\n'
    );
  } catch {
    process.stderr.write(
      'Attachment normalization failed; see the private report when available\n'
    );
    process.exitCode = 1;
  } finally {
    await app?.close();
  }
}
if (require.main === module) void main();
