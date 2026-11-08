import { app } from './app.js';
import { env } from './config/env.js';

app.listen(env.PORT, () => {
  // Safe log without any secrets
  console.log(`CrewDesk Server listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
});
