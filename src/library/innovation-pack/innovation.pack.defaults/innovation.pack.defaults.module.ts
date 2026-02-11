import { Module } from '@nestjs/common';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { InnovationPackDefaultsService } from './innovation.pack.defaults.service';

@Module({
  imports: [NamingModule],
  providers: [InnovationPackDefaultsService],
  exports: [InnovationPackDefaultsService],
})
export class InnovationPackDefaultsModule {}
