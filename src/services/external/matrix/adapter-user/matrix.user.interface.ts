export interface IMatrixUser {
  name: string;
  username: string;
  password: string;
}

export interface IOperationalMatrixUser extends IMatrixUser {
  accessToken: string;
}
