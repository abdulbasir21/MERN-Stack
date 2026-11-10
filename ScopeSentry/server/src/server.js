import app from './app.js';
import { config } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './db/connection.js';

async function startServer() {
  try {
    await connectDatabase();
    console.log(`[Database] Connected successfully (${config.env})`);

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
