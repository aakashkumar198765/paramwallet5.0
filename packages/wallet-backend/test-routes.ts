import { buildApp } from './src/app.js';

async function test() {
  const app = await buildApp();
  
  console.log('\n=== Registered Routes ===');
  const routes = app.printRoutes();
  console.log(routes);
  
  await app.close();
}

test().catch(console.error);
