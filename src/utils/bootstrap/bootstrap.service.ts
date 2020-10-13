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
    try {
      console.info('Bootstrapping Ecoverse...');
      const ctAdminDto = new UserInput();
      ctAdminDto.name = 'ctAdmin';
      ctAdminDto.email = 'admin@cherrytwist.org';
      ctAdminDto.lastName = 'admin';

      const user = await this.userService.getUserByEmail(
        'admin@cherrytwist.org'
      );
      if (user) {
        console.info(`${user.email} user already exists!`);
        if (!(await this.ecoverseService.addAdmin(user))) {
          console.info(`${user.email} already is an admin!`);
        } else {
          console.info(
            `${user.email} added to the admins group on Ecoverse level!`
          );
        }
        return;
      }

      const ctAdmin = await this.userService.createUser(ctAdminDto);
      console.info(`${ctAdmin.email} created!`);
      await this.ecoverseService.addAdmin(ctAdmin);
      console.info(
        `${ctAdmin.email} added to the admins group on Ecoverse level!`
      );
    } catch (error) {
      console.log(error);
    }
  }
}
