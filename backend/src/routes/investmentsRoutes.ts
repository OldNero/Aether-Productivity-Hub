import { Hono } from 'hono';

const investmentsRoutes = new Hono<{ Bindings: any; Variables: any }>();

investmentsRoutes.use('*', async (c, next) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  return next();
});

investmentsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  const { results } = await db.prepare(`SELECT * FROM investments WHERE user_id = ? ORDER BY date DESC`).bind(user.id).all();
  return c.json(results);
});

investmentsRoutes.post('/', async (c) => {
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  const { symbol, type, price, quantity, commission, date, notes } = await c.req.json();
  const id = crypto.randomUUID();

  await db.prepare(`INSERT INTO investments (id, symbol, type, price, quantity, commission, date, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, symbol, type, price, quantity, commission || 0, date, notes || '', user.id)
    .run();
  
  const newItem = await db.prepare(`SELECT * FROM investments WHERE id = ?`).bind(id).first();
  return c.json(newItem);
});

investmentsRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  const id = c.req.param('id');
  const body = await c.req.json();

  // Basic patch structure simply handling what the frontend sends
  if (body.symbol) {
     await db.prepare(`UPDATE investments SET symbol = ? WHERE id = ? AND user_id = ?`).bind(body.symbol, id, user.id).run();
  }
  return c.json({ success: true });
});

investmentsRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  const id = c.req.param('id');
  
  await db.prepare(`DELETE FROM investments WHERE id = ? AND user_id = ?`).bind(id, user.id).run();
  return c.json({ success: true });
});

investmentsRoutes.post('/batch-delete', async (c) => {
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  const { ids } = await c.req.json();
  
  if (!Array.isArray(ids) || ids.length === 0) return c.json({ success: true });

  // D1 does not have IN (?, ?, ?) with array binding easily, so prepare statement
  const placeholders = ids.map(() => '?').join(',');
  await db.prepare(`DELETE FROM investments WHERE user_id = ? AND id IN (${placeholders})`)
    .bind(user.id, ...ids)
    .run();
    
  return c.json({ success: true });
});

investmentsRoutes.delete('/asset/:symbol', async (c) => {
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  const symbol = c.req.param('symbol');
  
  await db.prepare(`DELETE FROM investments WHERE symbol = ? AND user_id = ?`).bind(symbol, user.id).run();
  return c.json({ success: true });
});

export default investmentsRoutes;
