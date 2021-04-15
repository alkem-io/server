export class Init {
  readonly type = 'INIT';
}
export class ApproveApplication {
  readonly type = 'APPROVE';
  constructor(public applicationID: number) {}
}

export class RejectApplication {
  readonly type = 'REJECT';
  constructor(public applicationID: number) {}
}

export class ReopenApplication {
  readonly type = 'REOPEN';
  constructor(public applicationID: number) {}
}

export class ArchiveApplication {
  readonly type = 'ARCHIVE';
  constructor(public applicationID: number) {}
}

export type ApplicationLifecycleEvent =
  | Init
  | ApproveApplication
  | RejectApplication
  | ReopenApplication
  | ArchiveApplication;
