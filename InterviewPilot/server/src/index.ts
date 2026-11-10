import { env, validateEnv } from './config/env.js';
import { createApp } from './app.js';
import { logger } from './lib/logger.js';

validateEnv(process.env, { logStatus: true });

const app = createApp();

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'InterviewPilot API server started');
});
