import { innovationFlowStatesDefault } from './space.defaults.innovation.flow';

export const templatesSetDefaults: any = {
  posts: [
    {
      profile: {
        displayName: "📝 Meeting Notes",
        description: "A sample post template for capturing the **results of meetings** is a structured format designed to efficiently document key outcomes, decisions, and 👉 action items from a meeting. This template provides a systematic approach to ensure that important information is recorded comprehensively and can be easily referenced later. 📝\n",
        tags: ["Notes"],
      },
      type: 'Meeting Notes',
      defaultDescription: "## 💭 Your meeting insights\n\n📅 **Date:**\n\n*Let's note the date of your interaction for context.*\n\n👥 **Present:**\n\n*Mention who attended or participated in the community activity.*\n\n📝 **Notes:**\n\n*Capture your observations or key takeaways from the community interaction.*\n\n🔁 **Next steps:**\n\n*Describe the specific actions or initiatives you plan to take based on the insights gained during the community interaction, propelling the community forward!*\n",
    },
    {
      profile: {
        displayName: "👀 Related Initiative",
        description:
          "Utilize this template to collect information about other **relevant initiatives**. Whether they are similar in nature, provide support, or simply need to be acknowledged, this template helps you keep track of them.\n",
        tags: ["Suggestions", "Initiatives"],
      },
      type: "Related Initiative",
      defaultDescription:
        "👀 **Name of the related initiative**:\n\n*Name/title*\n\n🤝 **Description of the related initiative:**\n\n*Description*\n\n🗻 **Describe the relevane of the related initiative:**\n\n*Explore how these initiatives align with this initiative*\n\n✏️ **Additional information**\n\n*Provide any extra information or context relevant to the initiative*\n",
    },
    {
      profile: {
        displayName: "Community Needs 👥",
        description:
          "Progress needs people and so do we! Gather the knowledge, activities or other blockers that are needed to start making impact by using this template. Ask people if they are you someone that can help you or if they know someone who can !💬\n\nTogether, transform challenges into opportunities and propel your space forward! 🚀💪\n",
        tags: ["Cooperation", "Guidance"],
      },
      type: "Community Needs 👥",
      defaultDescription:
        "💬**What is blocking this space at the moment?**\n\n*Uncover the current challenges and obstacles that hinder progress in this space. What barriers are present, and how do they impact the community?*\n\n📢 **Describe your call to action**:\n\n*What steps can we take to address these challenges, and how can we overcome these obstacles?*\n\n📚 **Type of knowledge, expertise, and resources:**\n\n*Specify the types of knowledge, expertise, and resources needed to navigate and overcome the identified challenges*\n\n✏️ **Additional context:**\n\n*providing additional context*\n\nTogether, let's transform challenges into opportunities and propel this space forward! 🚀💪\n",
    },
  ],
  innovationFlows: [
    {
      profile: {
        displayName: 'Default innovationFlow',
        description: 'Default innovationFlow',
        tags: ['default'],
      },
      states: innovationFlowStatesDefault,
    },
  ],
};
