import app from './app.js';
import { config } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './db/connection.js';
import { cleanupStaleInvestigations } from './services/investigationService.js';

async function startServer() {
  try {
    await connectDatabase();
    console.log(`[Database] Connected successfully (${config.env})`);

    // BR-I4: Clean up any investigations stuck in 'running' on startup
    const cleaned = await cleanupStaleInvestigations(15);
    if (cleaned > 0) {
      console.log(`[ScopeSentry API] Cleaned up ${cleaned} stale running investigation(s)`);
    }

    const server = app.listen(config.port, () => {
      console.log(`[ScopeSentry API] Server listening on port ${config.port} (${config.env})`);
    });

    const shutdown = async (signal) => {
      console.log(`[ScopeSentry API] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDatabase();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error(`[ScopeSentry API] Startup failure: ${error.message}`);
    process.exit(1);
  }
}

startServer();
