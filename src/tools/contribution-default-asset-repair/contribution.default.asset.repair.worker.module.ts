import configuration from '@config/configuration';
import { buildRuntimeDataSourceOptions } from '@config/runtime.datasource.options';
import { WinstonConfigService } from '@config/winston.config';
import { GraphqlGuardModule } from '@core/authorization/graphql.guard.module';
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileServiceAdapterModule } from '@services/adapters/file-service-adapter/file.service.adapter.module';
import { DocumentModule } from '@domain/storage/document/document.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { AlkemioConfig } from '@src/types';
import { WinstonModule } from 'nest-winston';
import { join } from 'node:path';
import { ContributionDefaultAssetRepairService } from './contribution.default.asset.repair.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
      isGlobal: true,
      load: [configuration],
    }),
    WinstonModule.forRootAsync({ useClass: WinstonConfigService }),
    TypeOrmModule.forRootAsync({
      name: 'default',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService<AlkemioConfig, true>) =>
        buildRuntimeDataSourceOptions(config, join(__dirname, '..', '..', '..')),
    }),
    FileServiceAdapterModule,
    CacheModule.register({ isGlobal: true }),
    DocumentModule,
    StorageBucketModule,
    GraphqlGuardModule,
  ],
  providers: [ContributionDefaultAssetRepairService],
})
export class ContributionDefaultAssetRepairWorkerModule {}
