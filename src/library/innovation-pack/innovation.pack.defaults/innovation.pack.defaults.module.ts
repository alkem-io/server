import { Module } from '@nestjs/common';
import { InnovationPackDefaultsService } from './innovation.pack.defaults.service';
import { NamingModule } from '@services/infrastructure/naming/naming.module';

@Module({
  imports: [NamingModule],
  providers: [InnovationPackDefaultsService],
  exports: [InnovationPackDefaultsService],
})
export class InnovationPackDefaultsModule {}
