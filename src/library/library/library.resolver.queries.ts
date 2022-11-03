import { Query, Resolver } from '@nestjs/graphql';
import { ILibrary } from './library.interface';
import { LibraryService } from './library.service';

@Resolver(() => ILibrary)
export class LibraryResolverQueries {
  constructor(private libraryService: LibraryService) {}

  @Query(() => ILibrary, {
    nullable: false,
    description: 'Alkemio Library',
  })
  async library(): Promise<ILibrary> {
    return await this.libraryService.getLibraryOrFail();
  }
}
