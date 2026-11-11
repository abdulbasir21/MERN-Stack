import { env, validateEnv } from './config/env.js';
import { createApp } from './app.js';
import { logger } from './lib/logger.js';
import { validateStartupEmbeddingConfig } from './lib/chunking.js';
import { EMBEDDING_DIMENSIONS } from './config/constants.js';

validateEnv(process.env, { logStatus: true });
validateStartupEmbeddingConfig(env.EMBEDDING_DIMENSIONS, EMBEDDING_DIMENSIONS);

const app = createApp();

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'InterviewPilot API server started');
});
