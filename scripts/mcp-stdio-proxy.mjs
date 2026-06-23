#!/usr/bin/env node
/**
 * MCP Stdio-to-HTTP Proxy for Alkemio MCP Server
 *
 * This script acts as a bridge between stdio-based MCP clients (like Claude Code)
 * and the HTTP-based Alkemio MCP server.
 *
 * Usage:
 *   node mcp-stdio-proxy.mjs [--url URL] [--api-key KEY]
 *
 * Environment variables:
 *   MCP_SERVER_URL - The MCP server URL (default: http://localhost:4000/rest/mcp)
 *   MCP_API_KEY - The API key for authentication
 */

import { createInterface } from 'readline';

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || process.argv.find(arg => arg.startsWith('--url='))?.split('=')[1] || 'http://localhost:4000/rest/mcp';
const MCP_API_KEY = process.env.MCP_API_KEY || process.argv.find(arg => arg.startsWith('--api-key='))?.split('=')[1] || '';

let sessionId = null;

/**
 * Send a JSON-RPC message to the MCP server via HTTP
 */
async function sendToServer(message) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  };

  if (MCP_API_KEY) {
    headers['X-MCP-API-Key'] = MCP_API_KEY;
  }

  if (sessionId) {
    headers['mcp-session-id'] = sessionId;
  }

  try {
    const response = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(message),
    });

    // Capture session ID from response headers
    const newSessionId = response.headers.get('mcp-session-id');
    if (newSessionId) {
      sessionId = newSessionId;
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/event-stream')) {
      // Parse SSE response
      const text = await response.text();
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data.trim()) {
            try {
              return JSON.parse(data);
            } catch {
              // Continue to next line
            }
          }
        }
      }

      // If no valid data found in SSE, return error
      return {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Failed to parse SSE response',
        },
        id: message.id || null,
      };
    } else {
      // Parse JSON response
      const result = await response.json();
      return result;
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: `HTTP request failed: ${error.message}`,
      },
      id: message.id || null,
    };
  }
}

/**
 * Write a JSON-RPC message to stdout
 */
function writeResponse(response) {
  process.stdout.write(JSON.stringify(response) + '\n');
}

/**
 * Process incoming JSON-RPC messages from stdin
 */
async function processMessage(line) {
  if (!line.trim()) return;

  let message;
  try {
    message = JSON.parse(line);
  } catch {
    writeResponse({
      jsonrpc: '2.0',
      error: {
        code: -32700,
        message: 'Parse error: Invalid JSON',
      },
      id: null,
    });
    return;
  }

  const response = await sendToServer(message);
  writeResponse(response);
}

/**
 * Main entry point
 */
async function main() {
  // Log startup to stderr (not stdout, which is for MCP messages)
  console.error(`MCP Stdio Proxy started`);
  console.error(`  Server URL: ${MCP_SERVER_URL}`);
  console.error(`  API Key: ${MCP_API_KEY ? '***' + MCP_API_KEY.slice(-4) : '(none)'}`);

  const rl = createInterface({
    input: process.stdin,
    terminal: false,
  });

  // Queue for sequential processing (needed to maintain session state)
  const messageQueue = [];
  let processing = false;
  let stdinClosed = false;

  async function processQueue() {
    if (processing) return;
    processing = true;

    while (messageQueue.length > 0) {
      const line = messageQueue.shift();
      await processMessage(line);
    }

    processing = false;

    // If stdin closed and queue empty, exit
    if (stdinClosed && messageQueue.length === 0) {
      console.error('MCP Stdio Proxy: all messages processed, exiting');
      process.exit(0);
    }
  }

  rl.on('line', (line) => {
    messageQueue.push(line);
    processQueue();
  });

  rl.on('close', () => {
    stdinClosed = true;
    // Trigger queue processing in case it's idle
    if (!processing && messageQueue.length === 0) {
      console.error('MCP Stdio Proxy: stdin closed, exiting');
      process.exit(0);
    }
  });

  // Handle process signals
  process.on('SIGINT', () => {
    console.error('MCP Stdio Proxy: received SIGINT, exiting');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.error('MCP Stdio Proxy: received SIGTERM, exiting');
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('MCP Stdio Proxy fatal error:', error);
  process.exit(1);
});
