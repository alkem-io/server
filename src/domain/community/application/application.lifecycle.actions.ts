export const applicationLifecycleActions = {
  actions: {
    addMember: (context: any, event: any) => {
      const appID = context.applicationID;
      const eventStr = JSON.stringify(event);
      const msg = `adding member from application ${appID}...on event ${eventStr}`;
      // console.log(msg);
      return msg;
    },
  },
};
