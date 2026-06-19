import { initializeApp } from 'firebase/app';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { readFileSync } from 'fs';

async function main() {
  const config = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf8'));
  const app = initializeApp(config);
  const { initializeFirestore } = await import('firebase/firestore');
  const db = initializeFirestore(app, { experimentalForceLongPolling: true });

  const { MENU_ITEMS } = await import('./src/types');
  
  // Scaping the users list cleanly from src/db.ts
  const dbFileContent = readFileSync('./src/db.ts', 'utf8');
  let usersToSeed = [];
  try {
    const match = dbFileContent.match(/const usersToSeed = (\[[\s\S]*?\]);/);
    if (match) {
        usersToSeed = eval(match[1]);
    } else {
        throw new Error("Could not find users array in db.ts");
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

  console.log("Seeding menu...");
  const menuBatch = writeBatch(db);
  for (const item of MENU_ITEMS) {
    menuBatch.set(doc(collection(db, 'menu')), { name: item.name, price: item.price });
  }
  await menuBatch.commit();
  console.log("Menu seeded.");

  console.log("Seeding users...");
  // Write batches have a limit of 500, we have ~48 so it's fine
  const userBatch = writeBatch(db);
  for (const u of usersToSeed) {
    userBatch.set(doc(collection(db, 'users')), u);
  }
  await userBatch.commit();
  console.log("Users seeded.");
  process.exit(0);
}

main();
