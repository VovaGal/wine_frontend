const probability = Number(import.meta.env.VITE_FESTIVAL_CHANCE ?? "0.25");

export const config = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, ""),
  demoMode: import.meta.env.VITE_DEMO_MODE === "true",
  festivalEnabled: import.meta.env.VITE_FESTIVAL_ENABLED === "true",
  festivalChance: Number.isFinite(probability)
    ? Math.min(1, Math.max(0, probability))
    : 0,
  festivalUrl:
    import.meta.env.VITE_FESTIVAL_URL ||
    "https://vino-svoe.ru/events/summer-wine-fest",
  feedbackEnabled: import.meta.env.VITE_FEEDBACK_ENABLED === "true",
  pollingIntervalMs: 1000,
  pollingTimeoutMs: 30000,
} as const;
