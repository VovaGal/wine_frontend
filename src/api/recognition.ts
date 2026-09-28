import { config } from "../config";
import type { RecognitionCreated, RecognitionStatus, Wine } from "../types";
import { demoResult } from "../data/demoRecognition";

/* ---------- Формы ответов бэкенда (локально, types.ts не меняем) ---------- */

interface BackendWine {
  id: number;
  slug: string;
  name: string;
  country?: string | null;
  region?: string | null;
  winery?: string | null;
  rating?: number | null;
  description?: string | null;
  source_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface BackendTask {
  task_id: string;
  status: string;
  detected_wine?: BackendWine | null;
  alternatives?: BackendWine[] | null;
  error?: string | null;
  finished_at?: string | null;
  elapsed_time?: number | null;
}

/* ---------- Вспомогательное ---------- */

function extractReason(payload: unknown): string {
  const detail = (payload as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  // FastAPI 422: detail — массив объектов { msg, loc, ... }
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (typeof d?.msg === "string" ? d.msg : ""))
      .filter(Boolean)
      .join("; ");
  }
  return "";
}

async function assertOk(response: Response): Promise<void> {
  if (response.ok) return;
  let reason = "";
  try {
    reason = extractReason(await response.json());
  } catch {
    /* Сервер мог вернуть простой текст. */
  }
  throw new Error(reason || `Сервис ответил с ошибкой ${response.status}.`);
}

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  heic: "image/heic",
};

/** Если браузер не определил тип файла (file.type === ""), берём его по расширению. */
function withMime(file: File): File {
  if (file.type) return file;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const type = MIME_BY_EXT[ext];
  return type ? new File([file], file.name, { type }) : file;
}

function toWine(w: BackendWine): Wine {
  return {
    id: w.id,
    external_id: w.slug,
    name: w.name,
    country: w.country ?? "",
    region: w.region ?? "",
    winery: w.winery ?? "",
    // Бэкенд отдаёт 0.0 для вин без оценки — на фронте это "нет рейтинга"
    rating: typeof w.rating === "number" && w.rating > 0 ? w.rating : null,
    description: w.description ?? "",
    source_url: w.source_url ?? "",
  };
}

function toRecognitionStatus(task: BackendTask): RecognitionStatus {
  const detected = task.detected_wine ?? null;
  const alternatives = (task.alternatives ?? []).map(toWine);
  const finished = task.status === "completed";

  return {
    task_id: task.task_id,
    status: task.status,
    detected_wine_slug: detected?.slug ?? null,
    error: task.error ?? null,
    wine: detected ? toWine(detected) : null,
    source_checked: finished,
    source_wine_exists: finished ? detected !== null : null,
    fallback_message: null,
    similar_wines: alternatives,
    decision: !finished
      ? undefined
      : detected
        ? "matched"
        : alternatives.length > 0
          ? "ambiguous"
          : "unresolved",
  };
}

/* ---------- API ---------- */

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
      status_url: `/recognition/${taskId}`,
    };
  }

  const body = new FormData();
  const upload = withMime(file);
  body.append("image", upload, upload.name);

  const response = await fetch(`${config.apiBaseUrl}/recognition`, {
    method: "POST",
    body,
    signal,
  });
  await assertOk(response);

  // Бэкенд возвращает uuid4 задачи: принимаем и голую строку, и объект.
  const raw = (await response.text()).trim();
  let payload: unknown = raw;
  try {
    payload = JSON.parse(raw);
  } catch {
    /* Не JSON — значит, вернулся голый uuid. */
  }

  const taskId =
    typeof payload === "string"
      ? payload
      : ((payload as { task_id?: string; id?: string } | null)?.task_id ??
        (payload as { id?: string } | null)?.id ??
        "");

  if (!taskId) throw new Error("Сервис не вернул идентификатор задачи.");

  const extra =
    payload && typeof payload === "object"
      ? (payload as Partial<RecognitionCreated>)
      : {};

  return {
    task_id: taskId,
    status: extra.status ?? "pending",
    uploaded_image_id: extra.uploaded_image_id ?? 0,
    status_url: extra.status_url ?? `/recognition/${taskId}`,
  };
}

export async function getRecognition(
  taskId: string,
  signal?: AbortSignal,
): Promise<RecognitionStatus> {
  if (config.demoMode && taskId.startsWith("demo:"))
    return demoResult(taskId, signal);

  const response = await fetch(
    `${config.apiBaseUrl}/recognition/${encodeURIComponent(taskId)}`,
    { signal, cache: "no-store" },
  );
  await assertOk(response);
  return toRecognitionStatus((await response.json()) as BackendTask);
}