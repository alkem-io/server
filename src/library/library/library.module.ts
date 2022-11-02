import { InnovationPackModule } from '@library/innovation-pack/innovation.pack.module';
import { Module } from '@nestjs/common';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { LibraryResolverQueries } from './library.resolver.queries';
import { LibraryService } from './library.service';

@Module({
  imports: [InnovationPackModule, NamingModule],
  providers: [LibraryResolverQueries, LibraryService],
  exports: [LibraryService],
})
export class LibraryModule {}
