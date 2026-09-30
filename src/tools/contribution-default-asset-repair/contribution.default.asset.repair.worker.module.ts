import configuration from '@config/configuration';
import { buildRuntimeDataSourceOptions } from '@config/runtime.datasource.options';
import { WinstonConfigService } from '@config/winston.config';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileServiceAdapterModule } from '@services/adapters/file-service-adapter/file.service.adapter.module';
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
  ],
  providers: [ContributionDefaultAssetRepairService],
})
export class ContributionDefaultAssetRepairWorkerModule {}
