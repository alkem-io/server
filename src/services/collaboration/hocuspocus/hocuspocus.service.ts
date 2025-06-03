import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server } from '@hocuspocus/server';
import { Logger as HocuspocusLogger } from '@hocuspocus/extension-logger';
import * as Y from 'yjs';
import { AlkemioConfig } from '@src/types';

@Injectable()
export class HocuspocusService implements OnApplicationShutdown {
  private readonly logger = new Logger(HocuspocusService.name);
  private server!: Server;
  private readonly port: number;

  constructor(private configService: ConfigService<AlkemioConfig, true>) {
    // Get port from config or use default
    this.port = this.configService.get('hosting.port', { infer: true }) || 3000;
    this.initializeServer();
  }

  private initializeServer() {
    this.server = new Server({
      port: this.port + 1, // Use port + 1 for Hocuspocus WebSocket server
      extensions: [
        new HocuspocusLogger({
          log: (message: string) => this.logger.log(message),
        }),
      ],

      // Authentication hook
      onAuthenticate: async data => {
        const { token, documentName } = data;

        // Basic validation - in production you'd validate against your auth system
        if (!token) {
          throw new Error('Authentication required');
        }

        this.logger.log(`Authentication request for document: ${documentName}`);

        // For now, allow all authenticated requests
        // In a real implementation, you'd validate the token and check permissions
        return {
          user: {
            id: 'user-id', // Extract from token
            name: 'User Name', // Extract from token
          },
        };
      },

      // Document lifecycle hooks
      onLoadDocument: async data => {
        const { documentName, document } = data;
        this.logger.log(`Loading document: ${documentName}`);

        // Here you could load document content from your database
        // For now, start with empty document
        if (Y.encodeStateAsUpdate(document).length === 0) {
          // Initialize with empty content if document is new
          const yText = document.getText('content');
          yText.insert(
            0,
            `# Welcome to ${documentName}\n\nStart collaborating!`
          );
        }

        return document;
      },

      onStoreDocument: async data => {
        const { documentName, document } = data;
        this.logger.log(`Storing document: ${documentName}`);

        // Here you could persist the document to your database
        const content = document.getText('content').toString();
        this.logger.debug(
          `Document content length: ${content.length} characters`
        );

        // In a real implementation, save to database
        // await this.saveDocumentToDatabase(documentName, Y.encodeStateAsUpdate(document));
      },

      // Connection lifecycle
      onConnect: async data => {
        const { documentName } = data;
        this.logger.log(`Client connected to document: ${documentName}`);
      },

      onDisconnect: async data => {
        const { documentName } = data;
        this.logger.log(`Client disconnected from document: ${documentName}`);
      },

      // Error handling
      onDestroy: async _data => {
        this.logger.log('Hocuspocus server destroyed');
      },
    });
  }

  async startServer(): Promise<void> {
    try {
      await this.server.listen();
      this.logger.log(
        `Hocuspocus collaboration server started on port ${this.port + 1}`
      );
    } catch (error) {
      this.logger.error('Failed to start Hocuspocus server:', error);
      throw error;
    }
  }

  async stopServer(): Promise<void> {
    try {
      await this.server.destroy();
      this.logger.log('Hocuspocus server stopped');
    } catch (error) {
      this.logger.error('Error stopping Hocuspocus server:', error);
      throw error;
    }
  }

  getServerInstance(): Server {
    return this.server;
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`Application shutdown signal received: ${signal}`);
    await this.stopServer();
  }

  // Helper method to get document statistics
  async getDocumentStats(documentName: string): Promise<any> {
    // This would need to be implemented based on your needs
    // For now, return basic info
    return {
      documentName,
      isActive: true,
      // Add more stats as needed
    };
  }

  // Helper method to broadcast a message to all clients in a document
  async broadcastToDocument(documentName: string, message: any): Promise<void> {
    try {
      // Get the document instance and broadcast
      // This is a simplified example - actual implementation would depend on your needs
      this.logger.log(
        `Broadcasting message to document: ${documentName}`,
        message
      );
    } catch (error) {
      this.logger.error('Error broadcasting to document:', error);
    }
  }
}
