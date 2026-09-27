import { useCallback, useEffect, useRef, useState } from "react";
import { createRecognition, getRecognition } from "../api/recognition";
import { config } from "../config";
import type { RecognitionStatus, RecognitionView } from "../types";

const STORAGE_KEY = "svoe-vino:task-id";
const IMAGE_ID_KEY = "svoe-vino:image-id";
const pause = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const abort = () => {
      window.clearTimeout(timeout);
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    const cleanup = () => signal.removeEventListener("abort", abort);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });

export function rememberedTaskId(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function remember(taskId: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, taskId);
  } catch {
    /* private mode */
  }
}
function rememberImageId(imageId: number) {
  try {
    sessionStorage.setItem(IMAGE_ID_KEY, String(imageId));
  } catch {
    /* private mode */
  }
}
function rememberedImageId(): number | null {
  try {
    const value = sessionStorage.getItem(IMAGE_ID_KEY);
    return value !== null && /^\d+$/.test(value) ? Number(value) : null;
  } catch {
    return null;
  }
}
function forget() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(IMAGE_ID_KEY);
  } catch {
    /* private mode */
  }
}

export function useRecognition() {
  const controller = useRef<AbortController | null>(null);
  const [view, setView] = useState<RecognitionView>("idle");
  const [taskId, setTaskId] = useState<string | null>(rememberedTaskId);
  const [uploadedImageId, setUploadedImageId] = useState<number | null>(
    rememberedImageId,
  );
  const [result, setResult] = useState<RecognitionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancel = useCallback((clearSaved = true) => {
    controller.current?.abort();
    controller.current = null;
    if (clearSaved) {
      forget();
      setTaskId(null);
      setUploadedImageId(null);
    }
    setView("idle");
    setResult(null);
    setError(null);
  }, []);
  useEffect(() => () => controller.current?.abort(), []);

  const poll = useCallback(async (id: string, signal: AbortSignal) => {
    const deadline = Date.now() + config.pollingTimeoutMs;
    while (!signal.aborted && Date.now() < deadline) {
      const response = await getRecognition(id, signal);
      if (response.status === "completed") {
        setResult(response);
        setView("completed");
        return;
      }
      if (response.status === "failed") {
        throw new Error(
          response.error ||
            "Не удалось распознать этикетку. Попробуйте другое фото.",
        );
      }
      setView("processing");
      await pause(config.pollingIntervalMs, signal);
    }
    if (!signal.aborted)
      throw new Error(
        "Ожидание затянулось. Можно повторить проверку результата.",
      );
  }, []);

  const run = useCallback(
    async (file?: File, existingId?: string) => {
      controller.current?.abort();
      const next = new AbortController();
      controller.current = next;
      setError(null);
      setResult(null);
      setView(file ? "uploading" : "processing");
      try {
        let id = existingId;
        if (file) {
          forget();
          const created = await createRecognition(file, next.signal);
          id = created.task_id;
          setUploadedImageId(created.uploaded_image_id);
          rememberImageId(created.uploaded_image_id);
          setTaskId(id);
          remember(id);
        }
        if (!id) throw new Error("Нет задачи для проверки результата.");
        setView("processing");
        await poll(id, next.signal);
      } catch (reason) {
        if (!next.signal.aborted) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Ошибка соединения. Попробуйте ещё раз.",
          );
          setView("failed");
        }
      }
    },
    [poll],
  );

  return { view, taskId, uploadedImageId, result, error, run, cancel };
}
