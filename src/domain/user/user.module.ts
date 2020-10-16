import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResolver } from './user.resolver';
import { ProfileModule } from '../profile/profile.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { MsGraphModule } from 'src/utils/ms-graph/ms-graph.module';

@Module({
  imports: [ProfileModule, TypeOrmModule.forFeature([User]), MsGraphModule],
  providers: [UserService, UserResolver],
  exports: [UserService],
})
export class UserModule {}
