/* eslint-disable @typescript-eslint/ban-types */

export interface ApplicationLifecycleSchema {
  states: {
    new: {};
    approved: {};
    rejected: {};
    archived: {};
  };
}

export interface ApplicationLifecycleContext {
  applicationID: number;
}
