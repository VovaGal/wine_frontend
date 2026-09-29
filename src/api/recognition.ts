import { config } from "../config";
import type { RecognitionCreated, RecognitionStatus, Wine } from "../types";
import { demoResult } from "../data/demoRecognition";

/* ---------- Формы ответов бэкенда (зеркало pydantic-моделей) ---------- */

type BackendStatus =
  | "accepting_results"
  | "waiting_for_ocr"
  | "waiting_for_cv"
  | "resolving"
  | "completed"
  | "partially_resolved"
  | "failed";

interface BackendWine {
  id: number;
  slug: string;
  wine_id: string;
  name: string;
  producer: string;
  region: string;
  style: string[];
  color: string;
  grapes: string[];
  year: number | null;
  alcohol_percent: number | null;
  image_url: string | null;
  aliases: Array<Record<string, unknown>>;
  search_text: string;
  created_at: string;
  updated_at: string;
}

interface BackendTask {
  task_id: string;
  status: BackendStatus;
  detected_wine: BackendWine | null;
  alternatives: BackendWine[];
  error: string | null;
  finished_at: string | null;
  elapsed_time: number | null;
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

/* ---------- Маппинг бэкенд -> фронтовые типы ---------- */

function toWine(w: BackendWine): Wine {
  const style = w.style.filter(Boolean).join(", ");
  const grapes = w.grapes.filter(Boolean);

  return {
    id: w.id,
    external_id: w.slug,
    name: w.name,
    country: "", // в WineDTO страны нет
    region: w.region,
    winery: w.producer,
    rating: null, // в WineDTO рейтинга нет, не выдумываем
    description: "", // описания тоже нет
    source_url: "", // ссылки на источник тоже нет
    image_url: w.image_url,
    grapes: grapes.length > 0 ? grapes : null,
    vintage: w.year,
    style: style || null,
  };
}

/** Бэкенд кладёт эту ошибку, когда ни один воркер не дал даже альтернатив. */
const NO_RESULT_ERROR = "no_recognition_result";

type Outcome = "processing" | "matched" | "partial" | "not_found" | "failed";

/** Три исхода скана + служебные состояния. */
function resolveOutcome(task: BackendTask): Outcome {
  const hasAlternatives = task.alternatives.length > 0;

  switch (task.status) {
    case "completed":
      if (task.detected_wine) return "matched";
      return hasAlternatives ? "partial" : "not_found";

    case "partially_resolved":
      return hasAlternatives ? "partial" : "not_found";

    case "failed":
      // «Не нашли ничего» — это не сбой, а повод предложить добавить вино.
      return task.error === NO_RESULT_ERROR ? "not_found" : "failed";

    default:
      // accepting_results / waiting_for_* / resolving
      return "processing";
  }
}

const FRONT_STATUS: Record<Outcome, string> = {
  processing: "processing",
  matched: "completed",
  partial: "completed",
  not_found: "completed",
  failed: "failed",
};

const DECISION: Record<Outcome, RecognitionStatus["decision"]> = {
  processing: undefined,
  matched: "matched",
  partial: "ambiguous",
  not_found: "unresolved",
  failed: undefined,
};

function toRecognitionStatus(task: BackendTask): RecognitionStatus {
  const outcome = resolveOutcome(task);
  const done = outcome === "matched" || outcome === "partial" || outcome === "not_found";

  // Основное вино показываем только при полном совпадении.
  const detected = outcome === "matched" ? task.detected_wine : null;

  return {
    task_id: task.task_id,
    status: FRONT_STATUS[outcome],
    detected_wine_slug: detected?.slug ?? null,
    error:
      outcome === "failed"
        ? (task.error ?? "Не удалось распознать вино.")
        : null,
    wine: detected ? toWine(detected) : null,
    source_checked: done,
    source_wine_exists: done ? detected !== null : null,
    fallback_message: null,
    similar_wines: outcome === "partial" ? task.alternatives.map(toWine) : [],
    decision: DECISION[outcome],
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
  body.append("crop", "false");

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