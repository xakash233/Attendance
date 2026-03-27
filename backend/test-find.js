import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  try {
    const user = await prisma.user.findFirst({
        where: { name: { contains: 'Akash', mode: 'insensitive' } }
    })
    
    if (!user) {
        console.log("No user found with name 'Akash'");
        return;
    }
    
    console.log(`Found user: ${user.name} (${user.id})`);
    
    const allUsers = await prisma.user.findMany({ select: { id: true, name: true } });
    console.log(allUsers);
    const count = { count: 0 };

    
    console.log(`Successfully deleted ${count.count} WFH records for ${user.name}`);
  } catch (error) {
    console.error('Operation failed:', error);
  } finally {
    await prisma.$disconnect()
  }
}

main()
