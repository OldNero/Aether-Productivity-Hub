import { Hono } from 'hono';

const eventsRoutes = new Hono<{ Bindings: any; Variables: any }>();

eventsRoutes.use('*', async (c, next) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  return next();
});

eventsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  const { results } = await db.prepare(`SELECT * FROM events WHERE user_id = ? ORDER BY start_time ASC`).bind(user.id).all();
  return c.json(results);
});

eventsRoutes.post('/', async (c) => {
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  const { title, description, start_time, end_time, location, color } = await c.req.json();
  const id = crypto.randomUUID();

  await db.prepare(`INSERT INTO events (id, title, description, start_time, end_time, location, color, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, title, description || '', start_time, end_time, location || '', color || '#3b82f6', user.id)
    .run();
  
  const newItem = await db.prepare(`SELECT * FROM events WHERE id = ?`).bind(id).first();
  return c.json(newItem);
});

eventsRoutes.post('/batch', async (c) => {
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  const { events } = await c.req.json();
  
  if (!Array.isArray(events) || events.length === 0) return c.json({ success: true, count: 0 });

  // D1 batch insert logic
  const statements = events.map(event => {
    const id = crypto.randomUUID();
    return db.prepare(`INSERT INTO events (id, title, description, start_time, end_time, location, color, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, event.title, event.description || '', event.start_time, event.end_time, event.location || '', event.color || '#3b82f6', user.id);
  });

  await db.batch(statements);
  return c.json({ success: true, count: events.length });
});

eventsRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  const id = c.req.param('id');
  
  await db.prepare(`DELETE FROM events WHERE id = ? AND user_id = ?`).bind(id, user.id).run();
  return c.json({ success: true });
});

export default eventsRoutes;
