import { useEffect, useRef, useState } from "react";
import { AlternativesSheet } from "../components/AlternativesSheet";
import { FestivalPrompt } from "../components/FestivalPrompt";
import { MissingWineForm } from "../components/MissingWineForm";
import { SommelierPlaceholder } from "../components/SommelierPlaceholder";
import { WineDetailSheet } from "../components/WineDetailSheet";
import { config } from "../config";
import type { RecognitionStatus, RecognitionView, Wine } from "../types";

interface Props {
  view: RecognitionView;
  taskId: string | null;
  uploadedImageId: number | null;
  result: RecognitionStatus | null;
  error: string | null;
  onRetry: () => void;
  onHome: () => void;
  onScanAgain: () => void;
}
const PROMPT_KEY = "svoe-vino:festival-prompted";
export function Results({
  view,
  taskId,
  uploadedImageId,
  result,
  error,
  onRetry,
  onHome,
  onScanAgain,
}: Props) {
  const strong = Boolean(
    result?.wine &&
    result.decision !== "ambiguous" &&
    result.decision !== "unresolved",
  );
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);
  const [festivalVisible, setFestivalVisible] = useState(false);
  const festivalPreviewShown = useRef(false);
  const [dismissedAlternatives, setDismissedAlternatives] = useState(false);
  useEffect(() => {
    if (strong && result?.wine) setSelectedWine(result.wine);
  }, [strong, result]);
  useEffect(() => {
    festivalPreviewShown.current = false;
  }, [taskId]);

  const closeDetail = () => {
    setSelectedWine(null);
    if (config.demoMode && taskId === "demo:matched:6") {
      if (!festivalPreviewShown.current) {
        festivalPreviewShown.current = true;
        setFestivalVisible(true);
      }
      return;
    }
    if (!strong || !config.festivalEnabled || !taskId) return;
    try {
      if (sessionStorage.getItem(PROMPT_KEY) === taskId) return;
      sessionStorage.setItem(PROMPT_KEY, taskId);
    } catch {
      /* Private browsing may block storage. */
    }
    if (Math.random() < config.festivalChance) setFestivalVisible(true);
  };
  const ranked =
    result?.candidates?.filter((item) => item.wine)?.slice(0, 3) ?? [];
  const hasAlternatives =
    ranked.length > 0 || Boolean(result?.similar_wines.length);
  const ambiguous = result?.decision === "ambiguous";
  const noWine =
    view === "completed" &&
    (ambiguous
      ? dismissedAlternatives && !selectedWine
      : !result?.wine || result.decision === "unresolved");

  return (
    <main className="result-page">
      <header className="result-header">
        <button className="round-back" onClick={onHome} aria-label="На главную">
          ←
        </button>
        <span>{config.demoMode ? "ДЕМО-РЕЖИМ" : "Ваш результат"}</span>
        <span className="header-step">02 / 02</span>
      </header>
      {(view === "uploading" || view === "processing" || view === "idle") && (
        <section className="processing-panel" role="status" aria-live="polite">
          <div className="processing-visual" aria-hidden="true">
            <span>✳</span>
          </div>
          <p className="eyebrow">ИЩЕМ ВИНО</p>
          <h1>
            {view === "uploading"
              ? "Загружаем фото…"
              : "Читаем историю этикетки…"}
          </h1>
          <p>Сравниваем надписи и изображение с каталогом российских вин.</p>
          <div className="progress-track">
            <i />
          </div>
          <button className="quiet-button" onClick={onScanAgain}>
            Вернуться к сканеру
          </button>
        </section>
      )}
      {view === "failed" && (
        <section className="state-panel">
          <span className="state-symbol" aria-hidden="true">
            ↻
          </span>
          <p className="eyebrow">ПОПРОБУЕМ СНОВА</p>
          <h1>Не получилось завершить поиск</h1>
          <p>{error || "Проверьте соединение и попробуйте ещё раз."}</p>
          <button
            className="button button--primary"
            onClick={onRetry}
            disabled={!taskId}
          >
            Проверить результат ещё раз
          </button>
          <button className="quiet-button" onClick={onScanAgain}>
            Сканировать заново
          </button>
        </section>
      )}
      {view === "completed" && (
        <>
          {strong && result?.wine && (
            <section className="result-summary">
              <span className="result-symbol" aria-hidden="true">
                ✳
              </span>
              <p className="eyebrow">МЫ НАШЛИ ЭТО ВИНО</p>
              <h1>{result.wine.name}</h1>
              <p>
                {result.wine.winery} · {result.wine.region}
              </p>
              {typeof result.confidence === "number" ? (
                <p className="muted small">
                  Уверенность модели:{" "}
                  {(result.confidence * 100).toFixed(1).replace(".", ",")}%
                </p>
              ) : typeof result.match_score === "number" ? (
                <p className="muted small">
                  Балл совпадения:{" "}
                  {result.match_score.toFixed(3).replace(".", ",")}
                </p>
              ) : null}
              <button
                className="button button--primary"
                onClick={() => setSelectedWine(result.wine)}
              >
                Открыть карточку ↗
              </button>
            </section>
          )}
          {ambiguous && (
            <section className="result-heading">
              <p className="eyebrow">ЕСТЬ НЕСКОЛЬКО ВАРИАНТОВ</p>
              <h1>Давайте уточним вино</h1>
            </section>
          )}
          {noWine && (
            <section className="result-heading">
              <p className="eyebrow">НОВАЯ НАХОДКА</p>
              <h1>
                Пока не нашли
                <br />
                <em>эту этикетку</em>
              </h1>
            </section>
          )}
          {hasAlternatives && !dismissedAlternatives && (
            <AlternativesSheet
              candidates={ranked}
              similarWines={result?.similar_wines}
              onSelect={setSelectedWine}
              onDismiss={() => setDismissedAlternatives(true)}
            />
          )}
          {noWine && (
            <MissingWineForm
              taskId={taskId}
              uploadedImageId={uploadedImageId}
              ocrLines={result?.ocr_lines}
            />
          )}
          {ambiguous && !ranked.length && result?.wine && (
            <div className="inline-panel">
              <p>
                Надёжность результата пока не подтверждена. Вы можете сравнить
                этикетку с найденной карточкой.
              </p>
              <button
                className="text-link"
                onClick={() => setSelectedWine(result.wine)}
              >
                Посмотреть возможное совпадение ↗
              </button>
            </div>
          )}
          <div className="result-lower">
            <SommelierPlaceholder />
            <button className="quiet-button" onClick={onScanAgain}>
              Сканировать другое вино ↗
            </button>
          </div>
        </>
      )}
      {selectedWine && (
        <WineDetailSheet wine={selectedWine} onClose={closeDetail} />
      )}
      {festivalVisible && (
        <FestivalPrompt
          eligible={result?.festival_eligible === true}
          onClose={() => setFestivalVisible(false)}
        />
      )}
    </main>
  );
}
