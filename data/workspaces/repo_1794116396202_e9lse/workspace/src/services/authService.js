// Simulated User Database Service
const users = [
  { id: 'u1', email: 'alice@example.com', name: 'Alice Smith', passwordHash: 'hash123' },
  { id: 'u2', email: 'bob@example.com', name: 'Bob Jones', passwordHash: 'hash456' }
];

export async function findUserByEmail(email) {
  // Database constraint: lookup email must be non-empty string
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new Error('Database lookup requires non-empty email string.');
  }
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim()) || null;
}
