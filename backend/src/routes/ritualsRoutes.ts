import { Hono } from 'hono';

const ritualsRoutes = new Hono<{ Bindings: any; Variables: any }>();

ritualsRoutes.use('*', async (c, next) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  return next();
});

ritualsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  const { results } = await db.prepare(`SELECT * FROM rituals WHERE user_id = ?`).bind(user.id).all();
  
  // Parse completed_days from JSON string
  const formatted = results.map(r => ({
    ...r,
    completed_days: typeof r.completed_days === 'string' ? JSON.parse(r.completed_days) : (r.completed_days || [])
  }));
  
  return c.json(formatted);
});

ritualsRoutes.post('/', async (c) => {
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  const { title, frequency } = await c.req.json();
  const id = crypto.randomUUID();

  await db.prepare(`INSERT INTO rituals (id, title, frequency, user_id) VALUES (?, ?, ?, ?)`)
    .bind(id, title, frequency || 'daily', user.id)
    .run();
  
  const newItem = await db.prepare(`SELECT * FROM rituals WHERE id = ?`).bind(id).first();
  return c.json(newItem);
});

ritualsRoutes.patch('/:id', async (c) => {
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  const id = c.req.param('id');
  const { completed_days, title, frequency } = await c.req.json();

  if (completed_days) {
    await db.prepare(`UPDATE rituals SET completed_days = ? WHERE id = ? AND user_id = ?`)
      .bind(JSON.stringify(completed_days), id, user.id)
      .run();
  }
  
  if (title) {
    await db.prepare(`UPDATE rituals SET title = ? WHERE id = ? AND user_id = ?`)
      .bind(title, id, user.id)
      .run();
  }

  if (frequency) {
     await db.prepare(`UPDATE rituals SET frequency = ? WHERE id = ? AND user_id = ?`)
      .bind(frequency, id, user.id)
      .run();
  }

  return c.json({ success: true });
});

ritualsRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  const id = c.req.param('id');
  
  await db.prepare(`DELETE FROM rituals WHERE id = ? AND user_id = ?`).bind(id, user.id).run();
  return c.json({ success: true });
});

export default ritualsRoutes;
