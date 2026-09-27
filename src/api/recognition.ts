import { config } from "../config";
import type { RecognitionCreated, RecognitionStatus } from "../types";
import { demoResult } from "../data/demoRecognition";

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let reason = "";
    try {
      const payload = (await response.json()) as { detail?: unknown };
      reason = typeof payload.detail === "string" ? payload.detail : "";
    } catch {
      /* The server may return plain text. */
    }
    throw new Error(reason || `Сервис ответил с ошибкой ${response.status}.`);
  }
  return response.json() as Promise<T>;
}
export async function createRecognition(
  file: File,
  signal?: AbortSignal,
): Promise<RecognitionCreated> {
  if (config.demoMode) {
    const requested = new URLSearchParams(window.location.search).get("demo");
    const scenario = ["matched", "ambiguous", "missing"].includes(
      requested ?? "",
    )
      ? requested
      : "matched";
    const fromFile = /^demo-wine-([1-6])\.jpg$/.exec(file.name)?.[1];
    const chosen =
      fromFile ??
      new URLSearchParams(window.location.search).get("wine") ??
      "1";
    const wine = ["1", "2", "3", "4", "5", "6"].includes(chosen) ? chosen : "1";
    const result =
      wine === "4"
        ? "ambiguous"
        : wine === "5"
          ? "missing"
          : wine === "6"
            ? "matched"
            : scenario;
    const taskId = `demo:${result}:${wine}`;
    return {
      task_id: taskId,
      status: "pending",
      uploaded_image_id: 0,
      status_url: `/recognition/tasks/${taskId}`,
    };
  }
  const body = new FormData();
  body.append("image", file, file.name);
  const response = await fetch(`${config.apiBaseUrl}/recognition/tasks`, {
    method: "POST",
    body,
    signal,
  });
  return readJson<RecognitionCreated>(response);
}
export async function getRecognition(
  taskId: string,
  signal?: AbortSignal,
): Promise<RecognitionStatus> {
  if (config.demoMode && taskId.startsWith("demo:"))
    return demoResult(taskId, signal);
  const response = await fetch(
    `${config.apiBaseUrl}/recognition/tasks/${encodeURIComponent(taskId)}`,
    { signal, cache: "no-store" },
  );
  return readJson<RecognitionStatus>(response);
}
