import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserGroup } from '@domain/user-group/user-group.entity';
import { UserGroupModule } from '@domain/user-group/user-group.module';
import { User } from '@domain/user/user.entity';
import { UserModule } from '@domain/user/user.module';
import { SearchResolver } from './search.resolver';
import { SearchService } from './search.service';
import { OrganisationModule } from '@domain/organisation/organisation.module';
import { Organisation } from '@domain/organisation/organisation.entity';

@Module({
  imports: [
    UserModule,
    UserGroupModule,
    OrganisationModule,
    TypeOrmModule.forFeature([User]),
    TypeOrmModule.forFeature([UserGroup]),
    TypeOrmModule.forFeature([Organisation]),
  ],
  providers: [SearchService, SearchResolver],
  exports: [SearchService],
})
export class SearchModule {}
