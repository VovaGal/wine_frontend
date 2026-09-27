import { config } from "../config";
import type { MissingWineSubmission } from "../types";

/** Reserved contract. Never report a successful submission until the
 * backend endpoint is added and the flag is enabled. */
export async function submitMissingWine(
  payload: MissingWineSubmission,
): Promise<void> {
  if (!config.feedbackEnabled)
    throw new Error("Отправка пока не подключена. Сохраните черновик.");
  const response = await fetch(
    `${config.apiBaseUrl}/feedback/wine-submissions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok)
    throw new Error("Не удалось отправить данные. Попробуйте позже.");
}
