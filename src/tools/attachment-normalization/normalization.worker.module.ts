import { join } from 'node:path';
import configuration from '@config/configuration';
import { buildRuntimeDataSourceOptions } from '@config/runtime.datasource.options';
import { GraphqlGuardModule } from '@core/authorization/graphql.guard.module';
import { MessageAttachmentModule } from '@domain/communication/message-attachment/message.attachment.module';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlkemioConfig } from '@src/types';
import { WinstonModule } from 'nest-winston';

/** No web listener, receipt consumer, scheduled job or repair-on-read. */
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
      isGlobal: true,
      load: [configuration],
    }),
    WinstonModule.forRoot({ silent: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AlkemioConfig, true>) => ({
        ...buildRuntimeDataSourceOptions(config, join(__dirname, '..', '..')),
        synchronize: false,
        migrationsRun: false,
        logging: false,
      }),
    }),
    CacheModule.register({ isGlobal: true }),
    GraphqlGuardModule,
    MessageAttachmentModule,
  ],
})
export class NormalizationWorkerModule {}
