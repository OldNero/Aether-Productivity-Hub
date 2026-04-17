import { Hono } from 'hono';

const tasksRoutes = new Hono<{ Bindings: any; Variables: any }>();

// Middleware to Ensure Auth
tasksRoutes.use('*', async (c, next) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  return next();
});

tasksRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  const { results } = await db.prepare(`SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC`).bind(user.id).all();
  return c.json(results);
});

tasksRoutes.post('/', async (c) => {
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  const { title, priority } = await c.req.json();
  const id = crypto.randomUUID();

  await db.prepare(`INSERT INTO tasks (id, title, priority, user_id) VALUES (?, ?, ?, ?)`)
    .bind(id, title, priority || 'medium', user.id)
    .run();
  
  const newTask = await db.prepare(`SELECT * FROM tasks WHERE id = ?`).bind(id).first();
  return c.json(newTask);
});

tasksRoutes.patch('/:id/toggle', async (c) => {
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  const taskId = c.req.param('id');

  const task: any = await db.prepare(`SELECT completed FROM tasks WHERE id = ? AND user_id = ?`).bind(taskId, user.id).first();
  if (!task) return c.json({ error: 'Task not found' }, 404);

  const newCompleted = task.completed ? 0 : 1;
  await db.prepare(`UPDATE tasks SET completed = ? WHERE id = ? AND user_id = ?`).bind(newCompleted, taskId, user.id).run();
  return c.json({ success: true, completed: newCompleted });
});

tasksRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  const taskId = c.req.param('id');
  
  await db.prepare(`DELETE FROM tasks WHERE id = ? AND user_id = ?`).bind(taskId, user.id).run();
  return c.json({ success: true });
});

export default tasksRoutes;
