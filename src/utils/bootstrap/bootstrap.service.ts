import { Injectable } from '@nestjs/common';
import { EcoverseService } from 'src/domain/ecoverse/ecoverse.service';
import { UserService } from 'src/domain/user/user.service';

@Injectable()
export class BootstrapService {
  constructor(
    private ecoverseService: EcoverseService,
    private userService: UserService
  ) {}

  async boostrapEcoverse() {
    this.ecoverseService.getEcoverse();
    this.userService.getOrCreateCtAdmin();
  }
}
