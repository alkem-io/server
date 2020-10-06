import { Injectable } from '@nestjs/common';
import { User } from './user.entity';
import { IUser } from './user.interface';

@Injectable()
export class UserService {
    
    async findUserByEmail(email: string): Promise<IUser | undefined>{
        return User.findOne({ email: email });
    }
}
