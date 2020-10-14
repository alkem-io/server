import { Module } from '@nestjs/common';
import { EcoverseModule } from 'src/domain/ecoverse/ecoverse.module';
import { UserModule } from 'src/domain/user/user.module';
import { BootstrapService } from './bootstrap.service';

@Module({
  providers: [BootstrapService],
  imports: [EcoverseModule, UserModule],
})
export class BootstrapModule {}
