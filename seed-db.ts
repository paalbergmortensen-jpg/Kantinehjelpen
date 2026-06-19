import { reseedAllUsers, seedInitialMenu } from './src/db';
import { db } from './src/firebase';
import { getDocs, collection } from 'firebase/firestore';

async function main() {
  console.log("Seeding database...");
  await reseedAllUsers();
  
  const menuSnap = await getDocs(collection(db, 'menu'));
  if (menuSnap.empty) {
    console.log("Seeding menu...");
    await seedInitialMenu();
  }
  
  console.log("Done seeding.");
  process.exit(0);
}

main();
