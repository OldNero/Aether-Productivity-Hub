import { Hono } from 'hono';

const sessionsRoutes = new Hono<{ Bindings: any; Variables: any }>();

sessionsRoutes.use('*', async (c, next) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  return next();
});

sessionsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  const { results } = await db.prepare(`SELECT * FROM focus_sessions WHERE user_id = ? ORDER BY start_time DESC`).bind(user.id).all();
  return c.json(results);
});

sessionsRoutes.post('/', async (c) => {
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  const { mode, duration, task_id, start_time } = await c.req.json();
  const id = crypto.randomUUID();

  await db.prepare(`INSERT INTO focus_sessions (id, mode, duration, task_id, start_time, user_id) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(id, mode, duration, task_id || null, start_time, user.id)
    .run();
  
  const newItem = await db.prepare(`SELECT * FROM focus_sessions WHERE id = ?`).bind(id).first();
  return c.json(newItem);
});

sessionsRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  const id = c.req.param('id');
  
  await db.prepare(`DELETE FROM focus_sessions WHERE id = ? AND user_id = ?`).bind(id, user.id).run();
  return c.json({ success: true });
});

export default sessionsRoutes;
