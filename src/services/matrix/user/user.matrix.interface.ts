export interface IMatrixUserService {
  register(user: IMatrixUser): Promise<IOperationalMatrixUser>;
  login(user: IMatrixUser): Promise<IOperationalMatrixUser>;
}

export interface IMatrixUser {
  name: string;
  username: string;
  password: string;
}

export interface IOperationalMatrixUser extends IMatrixUser {
  accessToken: string;
}
