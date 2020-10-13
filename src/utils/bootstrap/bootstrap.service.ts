import { Injectable } from '@nestjs/common';
import { EcoverseService } from 'src/domain/ecoverse/ecoverse.service';
import { UserInput } from 'src/domain/user/user.dto';
import { UserService } from 'src/domain/user/user.service';

@Injectable()
export class BootstrapService {
  constructor(
    private ecoverseService: EcoverseService,
    private userService: UserService
  ) {}

  async boostrapEcoverse() {
    this.ecoverseService.getEcoverse();
    const ctAdminDto = new UserInput();
    ctAdminDto.name = 'ctAdmin';
    ctAdminDto.email = 'admin@cherrytwist.org';
    ctAdminDto.lastName = 'admin';
    const ctAdmin = await this.userService.createUser(ctAdminDto);
    await this.ecoverseService.addAdmin(ctAdmin);
  }
}
