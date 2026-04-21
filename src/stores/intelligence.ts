import { defineStore } from 'pinia';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useTaskStore } from './tasks';
import { useTimerStore } from './timer';
import { useInvestmentStore } from './investments';
import { subDays, isSameDay, format, differenceInDays } from 'date-fns';

export interface AetherInsight {
  id: string;
  category: 'focus' | 'productivity' | 'portfolio' | 'balance' | 'streak';
  title: string;
  body: string;
}

export interface ProductivitySummary {
  taskCompletionRate: number;
  totalTasks: number;
  completedTasks: number;
  highPriorityPending: number;
  focusSessionsLast7Days: number;
  totalFocusMinutesLast7Days: number;
  avgFocusMinutesPerDay: number;
  longestStreakDays: number;
  currentStreakDays: number;
  bestDayOfWeek: string;
  portfolioHoldings: number;
  portfolioGainPercent: number;
  hasPortfolioData: boolean;
}

export const useIntelligenceStore = defineStore('intelligence', {
  state: () => ({
    insights: [] as AetherInsight[],
    momentumScore: 0,
    streakDays: 0,
    isLoading: false,
    lastUpdated: null as Date | null,
    summary: null as ProductivitySummary | null,
    error: null as string | null,
  }),

  getters: {
    momentumLabel: (state): string => {
      if (state.momentumScore >= 80) return 'Peak Flow';
      if (state.momentumScore >= 60) return 'Building Momentum';
      if (state.momentumScore >= 40) return 'Steady Pace';
      if (state.momentumScore >= 20) return 'Warming Up';
      return 'Getting Started';
    },
    momentumColor: (state): string => {
      if (state.momentumScore >= 80) return '#10b981'; // emerald
      if (state.momentumScore >= 60) return '#8b5cf6'; // violet
      if (state.momentumScore >= 40) return '#f59e0b'; // amber
      return '#6b7280'; // gray
    },
  },

  actions: {
    /**
     * Builds a structured, anonymized summary from all store data.
     */
    buildSummary(): ProductivitySummary {
      const taskStore = useTaskStore();
      const timerStore = useTimerStore();
      const investmentStore = useInvestmentStore();

      const now = new Date();
      const last7Days = Array.from({ length: 7 }, (_, i) => subDays(now, i));

      // Focus sessions over last 7 days
      const recentFocusSessions = timerStore.sessions.filter(s =>
        s.mode === 'focus' &&
        differenceInDays(now, new Date(s.start_time)) <= 6
      );
      const totalFocusMinutes = recentFocusSessions.reduce((acc, s) => acc + s.duration / 60, 0);

      // Best day of week by focus output
      const byDay: Record<string, number> = {};
      timerStore.sessions.filter(s => s.mode === 'focus').forEach(s => {
        const day = format(new Date(s.start_time), 'EEEE');
        byDay[day] = (byDay[day] || 0) + s.duration / 60;
      });
      const bestDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      // Streak calculation: consecutive days with at least one focus session
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      const last30Days = Array.from({ length: 30 }, (_, i) => subDays(now, i));
      for (let idx = 0; idx < last30Days.length; idx++) {
        const day = last30Days[idx];
        const hasSession = timerStore.sessions.some(
          s => s.mode === 'focus' && isSameDay(new Date(s.start_time), day)
        );
        if (hasSession) {
          tempStreak++;
          if (tempStreak > longestStreak) longestStreak = tempStreak;
          if (idx < 2) currentStreak = tempStreak;
        } else {
          if (idx === 0) currentStreak = 0;
          tempStreak = 0;
        }
      }

      const taskCompletionRate = taskStore.totalCount > 0
        ? taskStore.completedCount / taskStore.totalCount
        : 0;

      const highPriorityPending = taskStore.activeTasks.filter(t => t.priority === 'high').length;

      return {
        taskCompletionRate,
        totalTasks: taskStore.totalCount,
        completedTasks: taskStore.completedCount,
        highPriorityPending,
        focusSessionsLast7Days: recentFocusSessions.length,
        totalFocusMinutesLast7Days: Math.round(totalFocusMinutes),
        avgFocusMinutesPerDay: Math.round(totalFocusMinutes / 7),
        longestStreakDays: longestStreak,
        currentStreakDays: currentStreak,
        bestDayOfWeek: bestDay,
        portfolioHoldings: investmentStore.holdings.length,
        portfolioGainPercent: investmentStore.totalGainPercent,
        hasPortfolioData: investmentStore.investments.length > 0,
      };
    },

    /**
     * Calculates a deterministic 0-100 Momentum Score from the summary.
     */
    calculateMomentumScore(summary: ProductivitySummary): number {
      // Task completion rate: 0-100 → weight 30%
      const taskScore = summary.taskCompletionRate * 100 * 0.30;

      // Focus consistency (avg focus/day; 50+ min/day = max) → weight 40%
      const focusScore = Math.min(summary.avgFocusMinutesPerDay / 50, 1) * 100 * 0.40;

      // Streak bonus (7+ day streak = max) → weight 20%
      const streakScore = Math.min(summary.currentStreakDays / 7, 1) * 100 * 0.20;

      // Portfolio engagement (having data = 10pts) → weight 10%
      const portfolioScore = summary.hasPortfolioData ? 10 : 0;

      return Math.round(taskScore + focusScore + streakScore + portfolioScore);
    },

    /**
     * Generates AI insights via Gemini. Falls back to deterministic insights if no API key.
     */
    async generateInsights() {
      if (this.isLoading) return;
      this.isLoading = true;
      this.error = null;

      try {
        const taskStore = useTaskStore();
        const timerStore = useTimerStore();

        // Build data in parallel if not loaded
        if (!taskStore.isLoaded) await taskStore.fetchTasks();
        if (timerStore.sessions.length === 0) await timerStore.init();

        const summary = this.buildSummary();
        this.summary = summary;
        this.momentumScore = this.calculateMomentumScore(summary);
        this.streakDays = summary.currentStreakDays;

        const geminiKey = import.meta.env.VITE_GEMINI_KEY;

        if (geminiKey) {
          await this._generateWithGemini(summary, geminiKey);
        } else {
          this._generateDeterministicInsights(summary);
        }

        this.lastUpdated = new Date();
      } catch (err: any) {
        console.error('Intelligence generation failed:', err);
        this.error = 'Could not generate insights at this time.';
        // Always fall back to deterministic so the UI isn't empty
        if (this.summary) this._generateDeterministicInsights(this.summary);
      } finally {
        this.isLoading = false;
      }
    },

    async _generateWithGemini(summary: ProductivitySummary, apiKey: string) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `You are Aether, an intelligent productivity assistant. Analyze this user's data and generate exactly 4 concise, actionable insights. 

User's Weekly Performance Data:
- Tasks: ${summary.completedTasks} completed out of ${summary.totalTasks} total (${Math.round(summary.taskCompletionRate * 100)}% rate)
- High-priority tasks pending: ${summary.highPriorityPending}
- Focus sessions this week: ${summary.focusSessionsLast7Days}
- Total focus time this week: ${summary.totalFocusMinutesLast7Days} minutes
- Daily focus average: ${summary.avgFocusMinutesPerDay} minutes/day
- Current productivity streak: ${summary.currentStreakDays} days
- Best focus day historically: ${summary.bestDayOfWeek}
- Portfolio: ${summary.hasPortfolioData ? `${summary.portfolioHoldings} holdings, ${summary.portfolioGainPercent.toFixed(1)}% total gain` : 'No portfolio data'}

Respond with exactly 4 insights formatted as JSON array:
[
  { "category": "focus|productivity|portfolio|balance|streak", "title": "Short title (3-5 words)", "body": "One actionable sentence (max 20 words)." },
  ...
]
Only return valid JSON. No markdown, no explanation.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      // Parse the JSON response
      const parsed: Array<{ category: AetherInsight['category']; title: string; body: string }> = JSON.parse(text);
      this.insights = parsed.map((item, i) => ({
        id: `insight-${Date.now()}-${i}`,
        category: item.category,
        title: item.title,
        body: item.body,
      }));
    },

    _generateDeterministicInsights(summary: ProductivitySummary) {
      const insights: AetherInsight[] = [];

      // Focus insight
      if (summary.avgFocusMinutesPerDay < 25) {
        insights.push({
          id: 'det-focus-1',
          category: 'focus',
          title: 'Build Your Focus',
          body: `You're averaging ${summary.avgFocusMinutesPerDay}m/day. Try one 25-minute Pomodoro each morning to build the habit.`,
        });
      } else {
        insights.push({
          id: 'det-focus-2',
          category: 'focus',
          title: 'Strong Focus Week',
          body: `${summary.totalFocusMinutesLast7Days} focus minutes this week. Your best day is ${summary.bestDayOfWeek} — protect that time block.`,
        });
      }

      // Streak insight
      if (summary.currentStreakDays >= 3) {
        insights.push({
          id: 'det-streak-1',
          category: 'streak',
          title: `${summary.currentStreakDays}-Day Streak`,
          body: `You've been consistent for ${summary.currentStreakDays} days. One more session today keeps your momentum alive.`,
        });
      } else {
        insights.push({
          id: 'det-streak-2',
          category: 'streak',
          title: 'Start a Streak',
          body: `Log one focus session today to begin a productivity streak. Small daily actions compound fast.`,
        });
      }

      // Task insight
      if (summary.highPriorityPending > 0) {
        insights.push({
          id: 'det-task-1',
          category: 'productivity',
          title: 'Priority Alert',
          body: `You have ${summary.highPriorityPending} high-priority task${summary.highPriorityPending > 1 ? 's' : ''} pending. Tackle the hardest one first today.`,
        });
      } else if (summary.taskCompletionRate > 0.7) {
        insights.push({
          id: 'det-task-2',
          category: 'productivity',
          title: 'Excellent Velocity',
          body: `${Math.round(summary.taskCompletionRate * 100)}% task completion rate. You're operating in your top form.`,
        });
      } else {
        insights.push({
          id: 'det-task-3',
          category: 'productivity',
          title: 'Improve Your Rate',
          body: `${Math.round(summary.taskCompletionRate * 100)}% completion rate. Review overdue tasks and break them into smaller steps.`,
        });
      }

      // Portfolio insight
      if (summary.hasPortfolioData) {
        const gainText = summary.portfolioGainPercent >= 0
          ? `up ${summary.portfolioGainPercent.toFixed(1)}%`
          : `down ${Math.abs(summary.portfolioGainPercent).toFixed(1)}%`;
        insights.push({
          id: 'det-portfolio-1',
          category: 'portfolio',
          title: 'Portfolio Check-In',
          body: `Your ${summary.portfolioHoldings} holdings are ${gainText} overall. Review your allocation in the Investments view.`,
        });
      } else {
        insights.push({
          id: 'det-portfolio-2',
          category: 'portfolio',
          title: 'Track Investments',
          body: 'Import your TradingView CSV to unlock portfolio analytics and correlate wealth with productivity.',
        });
      }

      this.insights = insights;
    },
  },
});
