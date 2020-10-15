import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ecoverse } from 'src/domain/ecoverse/ecoverse.entity';
import { EcoverseModule } from 'src/domain/ecoverse/ecoverse.module';
import { UserModule } from 'src/domain/user/user.module';
import { BootstrapService } from './bootstrap.service';

@Module({
  imports: [EcoverseModule, UserModule, TypeOrmModule.forFeature([Ecoverse])],
  providers: [BootstrapService],
  exports: [BootstrapService],
})
export class BootstrapModule {}
