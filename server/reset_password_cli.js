const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node reset_password_cli.js <email> <new_password>');
    process.exit(1);
  }

  const [email, newPassword] = args;
  console.log(`Locating user with email: ${email}...`);

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.error(`Error: User with email "${email}" not found.`);
      process.exit(1);
    }

    console.log('User found. Hashing new password...');
    const passwordHash = await bcrypt.hash(newPassword, 10);

    console.log('Updating password hash in PostgreSQL...');
    await prisma.user.update({
      where: { email },
      data: { passwordHash }
    });

    console.log(`SUCCESS: Password for user "${email}" has been reset successfully!`);
  } catch (error) {
    console.error('Error executing password reset:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
