import { Hono } from 'hono';
import { initializeLucia } from '../auth';

// Pure WebCrypto PBKDF2 Hashing (Worker-safe)
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyBuffer = new TextEncoder().encode(password);
  const importedKey = await crypto.subtle.importKey("raw", keyBuffer, "PBKDF2", false, ["deriveBits"]);
  
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    importedKey,
    256
  );

  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(':');
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const keyBuffer = new TextEncoder().encode(password);
  const importedKey = await crypto.subtle.importKey("raw", keyBuffer, "PBKDF2", false, ["deriveBits"]);
  
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    importedKey,
    256
  );

  const currentHashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return currentHashHex === hashHex;
}

const authRoutes = new Hono<{ Bindings: any; Variables: any }>();

authRoutes.post('/signup', async (c) => {
  const { email, password, username } = await c.req.json();
  const db = c.env.DB as D1Database;
  const lucia = c.get('lucia');

  if (!email || !password) return c.json({ error: 'Missing credentials' }, 400);

  const hashedPassword = await hashPassword(password);
  const userId = crypto.randomUUID();

  try {
    await db.prepare(`INSERT INTO users (id, email, password_hash, username) VALUES (?, ?, ?, ?)`)
      .bind(userId, email, hashedPassword, username || email.split('@')[0])
      .run();

    const session = await lucia.createSession(userId, {});
    c.header('Set-Cookie', lucia.createSessionCookie(session.id).serialize(), { append: true });
    return c.json({ success: true, user: { id: userId, email, username } });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

authRoutes.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  const db = c.env.DB as D1Database;
  const lucia = c.get('lucia');

  const user: any = await db.prepare(`SELECT * FROM users WHERE email = ?`).bind(email).first();
  if (!user) return c.json({ error: 'Invalid email or password' }, 400);

  const validPassword = await verifyPassword(password, user.password_hash);
  if (!validPassword) return c.json({ error: 'Invalid email or password' }, 400);

  const session = await lucia.createSession(user.id, {});
  c.header('Set-Cookie', lucia.createSessionCookie(session.id).serialize(), { append: true });
  return c.json({ success: true, user: { id: user.id, email: user.email, username: user.username } });
});

authRoutes.post('/logout', async (c) => {
  const lucia = c.get('lucia');
  const session = c.get('session');
  if (!session) return c.json({ error: 'Not logged in' }, 401);
  
  await lucia.invalidateSession(session.id);
  c.header('Set-Cookie', lucia.createBlankSessionCookie().serialize(), { append: true });
  return c.json({ success: true });
});

authRoutes.patch('/profile', async (c) => {
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  if (!user) return c.json({ error: 'Not logged in' }, 401);

  const { username } = await c.req.json();
  if (!username) return c.json({ error: 'Missing username' }, 400);

  try {
    await db.prepare(`UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(username, user.id)
      .run();
    return c.json({ success: true, user: { ...user, username } });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

authRoutes.get('/me', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not logged in' }, 401);
  return c.json({ user });
});

export default authRoutes;
