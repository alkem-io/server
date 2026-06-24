export enum WhiteboardIntegrationEventPattern {
  CONTRIBUTION = 'contribution',
  CONTENT_MODIFIED = 'contentModified',
  HEALTH_CHECK = 'health-check',
  // Server -> collaboration service: emitted after a direct content write (e.g.
  // via the MCP update_whiteboard_content tool) so an open room reloads from DB.
  CONTENT_UPDATED_EXTERNALLY = 'contentUpdatedExternally',
}
