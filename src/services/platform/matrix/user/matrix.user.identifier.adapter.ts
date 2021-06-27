export class MatrixIdentifierAdapter {
  static mailRegex = /[@]/g;
  static email2username(email: string) {
    return email.replace(MatrixIdentifierAdapter.mailRegex, '=');
  }
  // TODO - this needs to be a service that works with env.HOST_NAME
  static username2id(username: string) {
    return `@${username}:cherrytwist.matrix.host`;
  }
  static email2id(email: string) {
    return MatrixIdentifierAdapter.username2id(
      MatrixIdentifierAdapter.email2username(email)
    );
  }
  static username2email(username: string) {
    return username.replace(/[=]/g, '@');
  }
  static id2email(id: string) {
    return MatrixIdentifierAdapter.username2email(
      id.replace('@', '').split(':')[0]
    );
  }
}
