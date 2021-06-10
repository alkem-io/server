export interface IMatrixUserService {
  register(email: string): Promise<IOperationalMatrixUser>;
  login(email: string): Promise<IOperationalMatrixUser>;
}

export interface IMatrixUser {
  name: string;
  username: string;
  password: string;
}

export interface IOperationalMatrixUser extends IMatrixUser {
  accessToken: string;
}
