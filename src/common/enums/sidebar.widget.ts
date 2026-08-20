import { registerEnumType } from '@nestjs/graphql';

// Stored codenames (JSONB values) are camelCase; the GraphQL layer serializes the
// uppercase enum names on the wire, matching the CalloutDescriptionDisplayMode convention.
export enum SidebarWidget {
  INTENT = 'intent',
  ABOUT = 'about',
  SUBSPACE_LINKS = 'subspaceLinks',
  EVENTS = 'events',
  UPDATES = 'updates',
  CONTACT_LEADS = 'contactLeads',
  ADD_USER = 'addUser',
  VIRTUAL_CONTRIBUTORS = 'virtualContributors',
  GUIDELINES = 'guidelines',
  INDEX = 'index',
}

registerEnumType(SidebarWidget, {
  name: 'SidebarWidget',
  description:
    'The widgets available for the Space sidepanel, per InnovationFlow state (tab).',
});
