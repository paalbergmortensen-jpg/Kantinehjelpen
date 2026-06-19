import { collection, doc, onSnapshot, runTransaction, setDoc, getDocs, updateDoc, writeBatch, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { User, Transaction, MenuItem, MENU_ITEMS, Report } from './types';

export const subscribeToUsers = (callback: (users: User[]) => void, onError?: (error: any) => void) => {
  return onSnapshot(
    collection(db, 'users'),
    (snapshot) => {
      const users: User[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      })) as User[];
      // Sort alphabetically by first name (protect against missing names)
      users.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
      callback(users);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
      if (onError) onError(error);
    }
  );
};

export const subscribeToReports = (callback: (reports: Report[]) => void) => {
  return onSnapshot(
    query(collection(db, 'reports'), orderBy('createdAt', 'desc')),
    (snapshot) => {
      const reports: Report[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      })) as Report[];
      callback(reports);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'reports');
    }
  );
};

export const subscribeToMenuItems = (callback: (items: MenuItem[]) => void) => {
  return onSnapshot(
    collection(db, 'menu'),
    (snapshot) => {
      const items: MenuItem[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      })) as MenuItem[];
      // Sort by name
      items.sort((a, b) => a.name.localeCompare(b.name));
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'menu');
    }
  );
};

export const createTransaction = async (
  user: User,
  amount: number,
  items: string
) => {

  const transactionRef = doc(collection(db, 'transactions'));
  const userRef = doc(db, 'users', user.id);

  try {
    // We must run in a batch or write sequentially since the rules don't enforce atomicity here
    // but the transaction needs the same updated values.
    // Actually, `updateDoc` and `setDoc` are fine.
    await setDoc(transactionRef, {
      userId: user.id,
      amount,
      items,
      timestamp: Date.now()
    });

    await updateDoc(userRef, {
      balance: user.balance + amount
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'transactions/users');
  }
};

export const seedInitialUsers = async () => {
  const usersToSeed = [
    { firstName: 'Rune', fullName: 'Gundersen, Rune', ansattNr: '12543', ressursNr: '602164', balance: 0 },
    { firstName: 'Cecilie', fullName: 'Jåsund, Cecilie Berntsen', ansattNr: '23346', ressursNr: '612610', balance: 0 },
    { firstName: 'Cathrine', fullName: 'Oftedahl, Cathrine', ansattNr: '15368', ressursNr: '605369', balance: 0 },
    { firstName: 'Hilde', fullName: 'Torgersen, Hilde', ansattNr: '13666', ressursNr: '603323', balance: 0 },
    { firstName: 'Ole Andreas', fullName: 'Bø, Ole Andreas', ansattNr: '13705', ressursNr: '603883', balance: 0 },
    { firstName: 'Arild', fullName: 'Eskeland, Arild', ansattNr: '13753', ressursNr: '603672', balance: 0 },
    { firstName: 'Einar', fullName: 'Espeland, Einar', ansattNr: '15386', ressursNr: '605403', balance: 0 },
    { firstName: 'Kristian', fullName: 'Fjelde, Kristian', ansattNr: '657289', ressursNr: '657289', balance: 0 },
    { firstName: 'Mari', fullName: 'Friestad, Mari', ansattNr: '22322', ressursNr: '611242', balance: 0 },
    { firstName: 'Thomas', fullName: 'Halleland, Thomas', ansattNr: '23659', ressursNr: '612872', balance: 0 },
    { firstName: 'Ronja Erika', fullName: 'Humblen, Ronja Erika', ansattNr: '657828', ressursNr: '657828', balance: 0 },
    { firstName: 'Marthe Synnøve', fullName: 'Johannessen, Marthe Synnøve Susort', ansattNr: '635360', ressursNr: '635360', balance: 0 },
    { firstName: 'Berit Helle', fullName: 'Jonsbråten, Berit Helle', ansattNr: '651043', ressursNr: '651043', balance: 0 },
    { firstName: 'Gina', fullName: 'Jøers, Gina', ansattNr: '657801', ressursNr: '657801', balance: 0 },
    { firstName: 'Gisle', fullName: 'Jørgensen, Gisle', ansattNr: '15379', ressursNr: '605266', balance: 0 },
    { firstName: 'Håkon', fullName: 'Kummermo, Håkon', ansattNr: '655693', ressursNr: '655693', balance: 0 },
    { firstName: 'Odd Rune', fullName: 'Kyllingstad, Odd Rune', ansattNr: '13756', ressursNr: '604017', balance: 0 },
    { firstName: 'Johan Mihle', fullName: 'Laugaland, Johan Mihle', ansattNr: '15396', ressursNr: '606297', balance: 0 },
    { firstName: 'Gunnar', fullName: 'Morsund, Gunnar', ansattNr: '15374', ressursNr: '604237', balance: 0 },
    { firstName: 'Øystein', fullName: 'Otterdal, Øystein', ansattNr: '15398', ressursNr: '605995', balance: 0 },
    { firstName: 'Marte', fullName: 'Skodje, Marte', ansattNr: '21887', ressursNr: '610579', balance: 0 },
    { firstName: 'Magnus', fullName: 'Stokka, Magnus', ansattNr: '21594', ressursNr: '610360', balance: 0 },
    { firstName: 'Lucas', fullName: 'Storsveen, Lucas Andreassen', ansattNr: '657784', ressursNr: '657784', balance: 0 },
    { firstName: 'Rosa', fullName: 'Villalobos, Rosa Iren', ansattNr: '20515', ressursNr: '609130', balance: 0 },
    { firstName: 'Even Hye', fullName: 'Barka, Even Hye Tytlandsvik', ansattNr: '642986', ressursNr: '642986', balance: 0 },
    { firstName: 'Ingvill', fullName: 'Bjorland, Ingvill', ansattNr: '23610', ressursNr: '613819', balance: 0 },
    { firstName: 'Simon Elias', fullName: 'Bogen, Simon Elias', ansattNr: '650052', ressursNr: '650052', balance: 0 },
    { firstName: 'Jon', fullName: 'Dagsland, Jon', ansattNr: '656884', ressursNr: '656884', balance: 0 },
    { firstName: 'Tom', fullName: 'Edvindsen, Tom', ansattNr: '15397', ressursNr: '606022', balance: 0 },
    { firstName: 'Øystein', fullName: 'Ellingsen, Øystein', ansattNr: '13668', ressursNr: '603319', balance: 0 },
    { firstName: 'Anett', fullName: 'Espeland, Anett Johansen', ansattNr: '15373', ressursNr: '604099', balance: 0 },
    { firstName: 'Eirik', fullName: 'Gjesdal, Eirik', ansattNr: '21044', ressursNr: '609735', balance: 0 },
    { firstName: 'Åse Karin', fullName: 'Hansen, Åse Karin', ansattNr: '11023', ressursNr: '606521', balance: 0 },
    { firstName: 'Thomas', fullName: 'Johnsen, Thomas Ystrøm', ansattNr: '15928', ressursNr: '610081', balance: 0 },
    { firstName: 'Lise Marit', fullName: 'Kalstad, Lise Marit', ansattNr: '20286', ressursNr: '611714', balance: 0 },
    { firstName: 'Per Øystein', fullName: 'Kvindesland, Per Øystein', ansattNr: '15375', ressursNr: '605232', balance: 0 },
    { firstName: 'Maja Johanne', fullName: 'Mathisen, Maja Johanne Sandbekklien', ansattNr: '650673', ressursNr: '650673', balance: 0 },
    { firstName: 'Ingvald', fullName: 'Nordmark, Ingvald', ansattNr: '15351', ressursNr: '603352', balance: 0 },
    { firstName: 'Håkon', fullName: 'Norheim, Håkon Jonassen', ansattNr: '648304', ressursNr: '648304', balance: 0 },
    { firstName: 'Elise', fullName: 'Pedersen, Elise', ansattNr: '648191', ressursNr: '648191', balance: 0 },
    { firstName: 'Torkel', fullName: 'Schibevaag, Torkel Anstensrud', ansattNr: '637598', ressursNr: '637598', balance: 0 },
    { firstName: 'Erik', fullName: 'Waage, Erik', ansattNr: '18025', ressursNr: '608201', balance: 0 },
    { firstName: 'Fride', fullName: 'Westvik, Fride Audunsdotter', ansattNr: '30936', ressursNr: '625038', balance: 0 },
    { firstName: 'Adrian', fullName: 'Årthun, Adrian Fosse', ansattNr: '654342', ressursNr: '654342', balance: 0 },
    { firstName: 'Torkel', fullName: 'Gidske, Torkel', ansattNr: '647786', ressursNr: '647786', balance: 0 },
    { firstName: 'Torill', fullName: 'Mjølsnes, Torill', ansattNr: '23748', ressursNr: '23748', balance: 0 },
    { firstName: 'Pål', fullName: 'Mortensen, Pål Berg', ansattNr: '634794', ressursNr: '634794', balance: 0 },
    { firstName: 'Jonna', fullName: 'Dunfjeld-Mølnvik, Jonna', ansattNr: '648856', ressursNr: '648856', balance: 0 }
  ];

  try {
    const batch = writeBatch(db);
    for (const u of usersToSeed) {
      const userRef = doc(collection(db, 'users'));
      batch.set(userRef, u);
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'users (seed)');
  }
};

export const resetUserBalances = async (userIds: string[]) => {
  try {
    const batch = writeBatch(db);
    for (const id of userIds) {
      const userRef = doc(db, 'users', id);
      batch.update(userRef, { balance: 0 });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'users (reset)');
  }
};

export const reseedAllUsers = async () => {
  try {
    // 1. Get all current users
    const snapshot = await getDocs(collection(db, 'users'));
    
    // 2. Delete all current users
    if (snapshot.docs.length > 0) {
      const deleteBatch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        deleteBatch.delete(d.ref);
      });
      await deleteBatch.commit();
    }

    // 3. Insert new users
    await seedInitialUsers();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'users (reseed)');
  }
};

export const createUser = async (user: Omit<User, 'id'>) => {
  try {
    const userRef = doc(collection(db, 'users'));
    await setDoc(userRef, user);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'users');
    throw error;
  }
};

export const updateUser = async (user: User) => {
  try {
    const userRef = doc(db, 'users', user.id);
    const { id, ...data } = user;
    await updateDoc(userRef, data as any);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'users');
    throw error;
  }
};

export const deleteUser = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'users');
    throw error;
  }
};

export const seedInitialMenu = async () => {
  try {
    const batch = writeBatch(db);
    for (const item of MENU_ITEMS) {
      const menuRef = doc(collection(db, 'menu'));
      batch.set(menuRef, { name: item.name, price: item.price }); // omitting id generated by fs
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'menu (seed)');
  }
};

export const createMenuItem = async (item: Omit<MenuItem, 'id'>) => {
  try {
    const menuRef = doc(collection(db, 'menu'));
    await setDoc(menuRef, item);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'menu');
  }
};

export const updateMenuItem = async (item: MenuItem) => {
  try {
    const menuRef = doc(db, 'menu', item.id);
    const { id, ...data } = item;
    await updateDoc(menuRef, data as any);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'menu');
  }
};

export const deleteMenuItem = async (itemId: string) => {
  try {
    const menuRef = doc(db, 'menu', itemId);
    await deleteDoc(menuRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'menu');
  }
};
