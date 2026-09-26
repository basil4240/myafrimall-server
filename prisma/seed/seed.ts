import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash, genSalt } from 'bcrypt';

const adapter = new PrismaPg(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

async function hashPassword(plain: string): Promise<string> {
  const salt = await genSalt();
  return hash(plain, salt);
}

const users = [
  {
    firstName: 'Dami',
    lastName: 'Admin',
    email: 'admin@myafrimall.com',
    password: 'Admin@1234',
    phone: '+2348100000001',
  },
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@myafrimall.com',
    password: 'John@1234',
    phone: '+2348100000002',
  },
  {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@myafrimall.com',
    password: 'Jane@1234',
    phone: '+2348100000003',
  },
  {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@myafrimall.com',
    password: 'Test@1234',
    phone: '+2348100000004',
  },
];

async function main() {
  console.log('Seeding...');

  for (const u of users) {
    const hashed = await hashPassword(u.password);

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        password: hashed,
        phone: u.phone,
        isVerified: true,
        wallet: { create: { balance: 0 } },
      },
    });

    console.log(`  ${user.email}`);
  }

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
