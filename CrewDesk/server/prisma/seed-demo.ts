import { prisma } from '../src/lib/prisma.js';
import { resetDemoWorkspace } from '../src/lib/resetDemo.js';

async function seedDemo() {
  console.log('Seeding comprehensive CrewDesk demo workspace...');
  const result = await resetDemoWorkspace();
  console.log(`Seeded ${result.demoUsersCount} demo accounts (isDemo = true).`);
  for (const u of result.coreUsers) {
    console.log(`- ${u.role.padEnd(18)} ${u.email.padEnd(28)} (${u.name})`);
  }
}

seedDemo()
  .catch((e) => {
    console.error('Demo seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
