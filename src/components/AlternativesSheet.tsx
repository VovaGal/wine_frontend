import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import type { Candidate, Wine } from "../types";

interface Props {
  candidates?: Candidate[];
  similarWines?: Wine[];
  onSelect: (wine: Wine) => void;
  onDismiss: () => void;
}
export function AlternativesSheet({
  candidates,
  similarWines,
  onSelect,
  onDismiss,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [wrappedIndex, setWrappedIndex] = useState<number | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const lastSwipeAt = useRef(0);
  const lastWheelAt = useRef(0);
  const lastRotationAt = useRef(-Infinity);
  const wrapTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (wrapTimer.current !== null) window.clearTimeout(wrapTimer.current);
    },
    [],
  );
  const ranked = candidates?.slice(0, 3) ?? [];
  const isRanked = ranked.length > 0;
  const items = isRanked
    ? ranked.map((item) => ({
        wine: item.wine,
        description: item.description,
        score: item.match_score,
        confidence: item.confidence,
      }))
    : (similarWines ?? [])
        .slice(0, 3)
        .map((wine) => ({
          wine,
          description: wine.description,
          score: null,
          confidence: null,
        }));
  const imageUrl = (value?: string | null) => {
    if (!value) return null;
    try {
      const url = new URL(value, window.location.origin);
      return url.protocol === "https:" || url.origin === window.location.origin
        ? url.href
        : null;
    } catch {
      return null;
    }
  };
  const rotate = (direction: number) => {
    if (items.length < 2 || performance.now() - lastRotationAt.current < 340)
      return;
    lastRotationAt.current = performance.now();
    // fixes carousel jitter
    setWrappedIndex(
      (activeIndex + (direction > 0 ? items.length - 1 : 1)) % items.length,
    );
    setActiveIndex((activeIndex + direction + items.length) % items.length);
    if (wrapTimer.current !== null) window.clearTimeout(wrapTimer.current);
    wrapTimer.current = window.setTimeout(() => {
      setWrappedIndex(null);
      wrapTimer.current = null;
    }, 280);
  };
  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    dragStart.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) {
      lastSwipeAt.current = performance.now();
      rotate(dx < 0 ? 1 : -1);
    }
  };
  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    if (performance.now() - lastWheelAt.current < 300) return;
    lastWheelAt.current = performance.now();
    rotate(event.deltaX > 0 ? 1 : -1);
  };
  if (!items.length) return null;
  return (
    <section className="alternatives" aria-labelledby="alternatives-heading">
      <p className="eyebrow">
        {isRanked ? "УТОЧНИМ РЕЗУЛЬТАТ" : "ДРУГИЕ ВИНА"}
      </p>
      <h2 id="alternatives-heading">
        {isRanked
          ? "Возможно, вы искали одно из этих вин?"
          : "Похожие вина в каталоге"}
      </h2>
      <p className="muted small">
        {isRanked
          ? "Выберите вариант, если узнали свою этикетку."
          : "Это похожие карточки каталога, а не подтверждённое распознавание вашего вина."}
      </p>
      <div
        className="alternatives-carousel"
        role="region"
        aria-label="Возможные вина, листайте горизонтально"
        tabIndex={0}
        onPointerDown={(event) => {
          dragStart.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={finishDrag}
        onPointerCancel={() => {
          dragStart.current = null;
        }}
        onWheel={handleWheel}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            rotate(event.key === "ArrowRight" ? 1 : -1);
          }
        }}
      >
        {items.map(({ wine, description, score, confidence }, index) => {
          const slot = (index - activeIndex + items.length) % items.length;
          const position =
            slot === 0 ? "active" : slot === 1 ? "next" : "previous";
          return (
            <button
              type="button"
              className={`alternative-card alternative-card--${position}${wrappedIndex === index ? " alternative-card--teleport" : ""}`}
              key={`${wine.external_id}-${index}`}
              onClick={() => {
                if (performance.now() - lastSwipeAt.current < 400) return;
                if (slot === 0) onSelect(wine);
                else rotate(slot === 1 ? 1 : -1);
              }}
            >
              <span className="alternative-card-top">
                <span>
                  0{index + 1} / 0{items.length}
                </span>
                <span aria-hidden="true">↗</span>
              </span>
              <span className="alternative-card-image">
                <span className="alternative-bottle" aria-hidden="true" />
                {imageUrl(wine.image_url) && (
                  <img
                    src={imageUrl(wine.image_url)!}
                    alt={`Этикетка ${wine.name}`}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </span>
              <span className="alternative-card-copy">
                <strong>{wine.name}</strong>
                <small>
                  {wine.winery} · {wine.region}
                </small>
                <small className="alternative-desc">
                  {description || "Описание пока не добавлено"}
                </small>
                {typeof confidence === "number" ? (
                  <small>
                    Уверенность модели:{" "}
                    {(confidence * 100).toFixed(1).replace(".", ",")}%
                  </small>
                ) : typeof score === "number" ? (
                  <small>
                    Балл совпадения: {score.toFixed(3).replace(".", ",")}
                  </small>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      <p className="alternatives-counter" aria-live="polite">
        {activeIndex + 1} / {items.length} · Листайте, чтобы сравнить этикетки
      </p>
      <button className="quiet-button" onClick={onDismiss}>
        Ни одно не подходит
      </button>
    </section>
  );
}
