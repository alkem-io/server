import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EcoverseService } from '../ecoverse/ecoverse.service';
import { ProfileService } from '../profile/profile.service';
import { UserGroup } from '../user-group/user-group.entity';
import { UserGroupService } from '../user-group/user-group.service';
import { User } from './user.entity';
import { IUser } from './user.interface';

@Injectable()
export class UserService {
  constructor(
    private profileService: ProfileService,
    private ecoverseService: EcoverseService,
    @Inject(forwardRef(() => UserGroupService))
    private userGroupService: UserGroupService,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  // Helper method to ensure all members that are arrays are initialised properly.
  // Note: has to be a seprate call due to restrictions from ORM.
  async initialiseMembers(user: IUser): Promise<IUser> {
    // Initialise contained singletons
    this.profileService.initialiseMembers(user.profile);

    return user;
  }
  async getUserByID(userID: number): Promise<IUser | undefined> {
    return this.userRepository.findOne({ id: userID });
  }

  async getUserByEmail(email: string): Promise<IUser | undefined> {
    return this.userRepository.findOne({ email: email });
  }

  async getOrCreateCtAdmin(): Promise<IUser> {
    let admin = await this.userRepository.findOne({
      email: 'admin@cherrytwist.org',
    });

    if (admin) return admin;

    const ctverse = await this.ecoverseService.getEcoverse();
    const adminsGroup = await this.userGroupService.getGroupByName(
      ctverse,
      'members'
    );

    admin = new User('ctAdmin');
    admin.email = 'admin@cherrytwist.org';
    admin.lastName = 'admin';
    admin.userGroups?.push(adminsGroup as UserGroup);
    await this.userRepository.save(admin);

    return admin;
  }
}
