import { prisma } from '../src/lib/prisma.js';
import { resetDemoWorkspace } from '../src/lib/resetDemo.js';

async function runResetDemo() {
  console.log('Resetting CrewDesk demo workspace (isDemo = true records only)...');
  const result = await resetDemoWorkspace();
  console.log(`Demo workspace reset complete. ${result.demoUsersCount} demo users active.`);
}

runResetDemo()
  .catch((e) => {
    console.error('Demo reset error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
