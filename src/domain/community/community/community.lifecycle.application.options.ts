export const communityLifecycleApplicationOptions = {
  actions: {
    communityAddMember: (context: any, event: any) => {
      const appID = context.parentID;
      const eventStr = JSON.stringify(event);
      const msg = `adding member from application ${appID}...on event ${eventStr}`;
      // console.log(msg);
      return msg;
    },
  },
};
