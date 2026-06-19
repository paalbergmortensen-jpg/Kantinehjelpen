export interface User {
  id: string; // Document ID
  firstName: string;
  fullName: string;
  ansattNr: string;
  ressursNr: string;
  balance: number;
}

export interface Transaction {
  id: string; // Document ID
  userId: string;
  amount: number;
  items: string;
  timestamp: number;
  adminId: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
}

export interface Report {
  id: string;
  createdAt: string;
  title: string;
  url: string;
  userCount: number;
}

export const MENU_ITEMS: MenuItem[] = [
  { id: '1', name: '1 Brødskive m/pålegg', price: 15.00 },
  { id: '2', name: '1 Knekkebrød m/pålegg', price: 10.00 },
  { id: '3', name: 'Egg', price: 5.00 },
  { id: '4', name: 'Juice flaske 0,25', price: 20.00 },
  { id: '5', name: 'Juice liten 0,25', price: 20.00 },
  { id: '6', name: 'Melk', price: 9.00 },
  { id: '7', name: 'Fjordland havregrøt', price: 24.00 },
  { id: '8', name: 'Fjordland grøtlunsj', price: 18.00 },
  { id: '9', name: 'Rislunsj', price: 15.00 },
  { id: '10', name: 'Yoghurt', price: 7.00 },
  { id: '11', name: 'God morgen yoghurt', price: 15.00 },
  { id: '12', name: 'Banan', price: 6.00 }
];
