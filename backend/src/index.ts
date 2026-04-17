import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { initializeLucia } from './auth';

type Bindings = {
  DB: D1Database;
  FRONTEND_URL: string;
  BACKEND_URL: string;
};

type Variables = {
  lucia: ReturnType<typeof initializeLucia>;
  user: any | null;
  session: any | null;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Setup CORS
app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: [c.env.FRONTEND_URL, 'http://localhost:5173'],
    credentials: true,
  });
  return corsMiddleware(c, next);
});

// Setup Auth Middleware
app.use('*', async (c, next) => {
  const lucia = initializeLucia(c.env.DB);
  c.set('lucia', lucia);

  const sessionId = lucia.readSessionCookie(c.req.header("Cookie") ?? "");
  if (!sessionId) {
    c.set("user", null);
    c.set("session", null);
    return next();
  }

  const { session, user } = await lucia.validateSession(sessionId);
  if (session && session.fresh) {
    c.header("Set-Cookie", lucia.createSessionCookie(session.id).serialize(), { append: true });
  }
  if (!session) {
    c.header("Set-Cookie", lucia.createBlankSessionCookie().serialize(), { append: true });
  }
  c.set("session", session);
  c.set("user", user);
  return next();
});

// Route Imports
import authRoutes from './routes/authRoutes';
import tasksRoutes from './routes/tasksRoutes';
import investmentsRoutes from './routes/investmentsRoutes';
import ritualsRoutes from './routes/ritualsRoutes';
import sessionsRoutes from './routes/sessionsRoutes';

app.route('/api/auth', authRoutes);
app.route('/api/tasks', tasksRoutes);
app.route('/api/investments', investmentsRoutes);
app.route('/api/rituals', ritualsRoutes);
app.route('/api/sessions', sessionsRoutes);

// Basic Healthcheck
app.get('/health', (c) => c.json({ status: 'ok' }));

export default app;
