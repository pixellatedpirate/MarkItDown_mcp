import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { MarkdownifyModule } from './modules/markdownify/markdownify.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module for Markdownify MCP Server
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'mcp-markdownify-server',
    version: '1.1.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [
    ConfigModule.forRoot(),
    MarkdownifyModule,
  ],
  providers: [
    SystemHealthCheck,
  ],
})
export class AppModule {}
