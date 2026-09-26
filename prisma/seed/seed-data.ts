import 'dotenv/config';
import { PrismaClient, ShipmentStatus, ServiceType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

interface Template {
  role: 'sender' | 'receiver';
  counterparty: string;
  from: string;
  to: string;
  weight: number;
  description: string;
  serviceType: ServiceType;
  status: ShipmentStatus;
  amount: number;
  processingTime: string;
  age: number;
}

// "sender" means the seeded user ships it; "receiver" means it is inbound.
const templates: Template[] = [
  { role: 'sender', counterparty: 'Emeka Obi', from: 'Lagos, Nigeria', to: 'London, UK', weight: 1.5, description: 'Documents', serviceType: ServiceType.EXPRESS, status: ShipmentStatus.PAID, amount: 42000, processingTime: '3-5 business days', age: 2 },
  { role: 'sender', counterparty: 'Sandra K.', from: 'Abuja, Nigeria', to: 'New York, USA', weight: 4.2, description: 'Clothing & Accessories', serviceType: ServiceType.EXPRESS, status: ShipmentStatus.IN_TRANSIT, amount: 68000, processingTime: '5-7 business days', age: 5 },
  { role: 'receiver', counterparty: 'Adaeze Nwosu', from: 'Enugu, Nigeria', to: 'Lagos, Nigeria', weight: 8.0, description: 'Electronics', serviceType: ServiceType.STANDARD, status: ShipmentStatus.PENDING, amount: 15000, processingTime: '5-7 business days', age: 7 },
  { role: 'sender', counterparty: 'Chidi Okafor', from: 'Port Harcourt, Nigeria', to: 'Toronto, Canada', weight: 2.8, description: 'Books', serviceType: ServiceType.ECONOMY, status: ShipmentStatus.DELAYED, amount: 22000, processingTime: '10-14 business days', age: 14 },
  { role: 'receiver', counterparty: 'Bunmi Tanny', from: 'Ibadan, Nigeria', to: 'Abuja, Nigeria', weight: 3.5, description: 'Food items', serviceType: ServiceType.STANDARD, status: ShipmentStatus.PAID, amount: 9500, processingTime: '3-5 business days', age: 20 },
  { role: 'sender', counterparty: 'Mercy Eze', from: 'Lagos, Nigeria', to: 'Berlin, Germany', weight: 1.0, description: 'Jewelry', serviceType: ServiceType.EXPRESS, status: ShipmentStatus.CANCELLED, amount: 35000, processingTime: '5-7 business days', age: 25 },
  { role: 'sender', counterparty: 'Tunde Bakare', from: 'Kano, Nigeria', to: 'Accra, Ghana', weight: 6.3, description: 'Textiles', serviceType: ServiceType.STANDARD, status: ShipmentStatus.IN_TRANSIT, amount: 28000, processingTime: '5-7 business days', age: 1 },
  { role: 'sender', counterparty: 'Grace Adeyemi', from: 'Lagos, Nigeria', to: 'Nairobi, Kenya', weight: 2.2, description: 'Cosmetics', serviceType: ServiceType.EXPRESS, status: ShipmentStatus.PENDING, amount: 51000, processingTime: '3-5 business days', age: 3 },
];

interface SeedUser {
  email: string;
  prefix: string;
  balance: number;
  legacyIds?: string[];
  addresses: {
    label: string;
    fullAddress: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    isDefault: boolean;
  }[];
}

const seedUsers: SeedUser[] = [
  {
    email: 'john.doe@myafrimall.com',
    prefix: 'JD',
    balance: 245000,
    legacyIds: [
      'MAM-A1B2C3D4', 'MAM-E5F6G7H8', 'MAM-I9J0K1L2', 'MAM-M3N4O5P6',
      'MAM-Q7R8S9T0', 'MAM-U1V2W3X4',
    ],
    addresses: [
      { label: 'Home', fullAddress: '12 Admiralty Way, Lekki Phase 1', city: 'Lagos', state: 'Lagos', country: 'Nigeria', postalCode: '106104', isDefault: true },
      { label: 'Office', fullAddress: '45 Adeola Odeku Street, Victoria Island', city: 'Lagos', state: 'Lagos', country: 'Nigeria', postalCode: '101241', isDefault: false },
    ],
  },
  {
    email: 'jane.smith@myafrimall.com',
    prefix: 'JS',
    balance: 180500,
    addresses: [
      { label: 'Home', fullAddress: '7 Aminu Kano Crescent, Wuse 2', city: 'Abuja', state: 'FCT', country: 'Nigeria', postalCode: '900288', isDefault: true },
      { label: 'Warehouse', fullAddress: '3 Industrial Layout, Trans Amadi', city: 'Port Harcourt', state: 'Rivers', country: 'Nigeria', postalCode: '500001', isDefault: false },
    ],
  },
  {
    email: 'test@myafrimall.com',
    prefix: 'TS',
    balance: 96000,
    addresses: [
      { label: 'Home', fullAddress: '21 Ring Road, Bodija', city: 'Ibadan', state: 'Oyo', country: 'Nigeria', postalCode: '200262', isDefault: true },
    ],
  },
  {
    email: 'admin@myafrimall.com',
    prefix: 'AD',
    balance: 500000,
    addresses: [
      { label: 'Head Office', fullAddress: '1 Marina Road, Lagos Island', city: 'Lagos', state: 'Lagos', country: 'Nigeria', postalCode: '101001', isDefault: true },
    ],
  },
];

async function seedUser(cfg: SeedUser) {
  const user = await prisma.user.findUnique({ where: { email: cfg.email } });
  if (!user) {
    console.error(`User ${cfg.email} not found. Run seed.ts first.`);
    process.exit(1);
  }

  const fullName = `${user.firstName} ${user.lastName}`;

  await prisma.wallet.upsert({
    where: { userId: user.id },
    update: { balance: cfg.balance },
    create: { userId: user.id, balance: cfg.balance, currency: 'NGN' },
  });

  for (const [i, t] of templates.entries()) {
    const trackingId =
      cfg.legacyIds?.[i] ?? `MAM-${cfg.prefix}${String(i + 1).padStart(6, '0')}`;
    const outbound = t.role === 'sender';

    await prisma.shipment.upsert({
      where: { trackingId },
      update: {},
      create: {
        trackingId,
        senderName: outbound ? fullName : t.counterparty,
        senderLocation: t.from,
        receiverName: outbound ? t.counterparty : fullName,
        receiverLocation: t.to,
        weight: t.weight,
        description: t.description,
        serviceType: t.serviceType,
        status: t.status,
        amount: t.amount,
        currency: 'NGN',
        processingTime: t.processingTime,
        createdAt: daysAgo(t.age),
        userId: user.id,
      },
    });
  }

  const existingAddresses = await prisma.address.count({
    where: { userId: user.id },
  });
  if (existingAddresses === 0) {
    await prisma.address.createMany({
      data: cfg.addresses.map((a) => ({ ...a, userId: user.id })),
    });
  }

  console.log(
    `${cfg.email}: ${templates.length} shipments, ${cfg.addresses.length} addresses, wallet NGN ${cfg.balance.toLocaleString('en-US')}`,
  );
}

async function main() {
  for (const cfg of seedUsers) {
    await seedUser(cfg);
  }
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
