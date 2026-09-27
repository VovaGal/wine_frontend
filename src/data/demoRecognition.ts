import type { RecognitionStatus, Wine } from "../types";

/** Local UI preview only. This never calls the OCR or embedding models. */
export async function loadDemoWines(signal?: AbortSignal): Promise<Wine[]> {
  const response = await fetch("/demo/wines.json", {
    signal,
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error("Не найден public/demo/wines.json. Проверьте файлы демо.");
  const wines: unknown = await response.json();
  if (
    !Array.isArray(wines) ||
    wines.length < 3 ||
    !wines
      .slice(0, 3)
      .every(
        (wine) =>
          wine &&
          typeof wine === "object" &&
          typeof wine.id === "number" &&
          typeof wine.name === "string" &&
          typeof wine.winery === "string" &&
          typeof wine.external_id === "string",
      )
  ) {
    throw new Error(
      "В public/demo/wines.json нужны минимум три карточки с id, external_id, name и winery.",
    );
  }
  return wines as Wine[];
}

export async function demoResult(
  taskId: string,
  signal?: AbortSignal,
): Promise<RecognitionStatus> {
  const wines = await loadDemoWines(signal);
  const base: RecognitionStatus = {
    task_id: taskId,
    status: "completed",
    detected_wine_slug: null,
    error: null,
    wine: null,
    source_checked: true,
    source_wine_exists: null,
    fallback_message: null,
    similar_wines: [],
    festival_eligible: false,
  };
  if (taskId.startsWith("demo:ambiguous"))
    return {
      ...base,
      decision: "ambiguous",
      candidates: wines.slice(0, 3).map((wine, index) => ({
        wine,
        match_score: [0.72, 0.68, 0.59][index],
        description: wine.description,
      })),
    };
  if (taskId.startsWith("demo:missing"))
    return {
      ...base,
      decision: "unresolved",
      ocr_lines: [{ text: "НОВАЯ ЭТИКЕТКА", confidence: 0.8 }],
    };
  const requested = Number(
    taskId.split(":")[2] ??
      new URLSearchParams(window.location.search).get("wine") ??
      "1",
  );
  const selected =
    requested === 6
      ? wines.find((wine) => wine.id === 6)
      : wines[
          Number.isInteger(requested) && requested >= 1 && requested <= 3
            ? requested - 1
            : 0
        ];
  if (!selected)
    throw new Error(
      "Не найдено демонстрационное вино 6 в public/demo/wines.json.",
    );
  return {
    ...base,
    wine: selected,
    detected_wine_slug: selected.external_id,
    source_wine_exists: true,
    decision: "matched",
    festival_eligible: false,
  };
}
