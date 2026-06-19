import { getAdminDb } from './src/lib/firebaseAdmin';

async function main() {
  console.log("Cleaning up duplicate users...");
  const db = getAdminDb();
  const snap = await db.collection('users').get();
  const users = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
  
  const uniqueNames = new Set<string>();
  let deletedCount = 0;
  
  for (const user of users) {
    if (uniqueNames.has(user.fullName)) {
      console.log(`Deleting duplicate user: ${user.fullName}`);
      await db.collection('users').doc(user.id).delete();
      deletedCount++;
    } else {
      uniqueNames.add(user.fullName);
    }
  }
  
  console.log(`Finished cleaning up. Deleted ${deletedCount} duplicate users.`);
  process.exit(0);
}

main();
