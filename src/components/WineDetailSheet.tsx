import type { Wine } from "../types";

interface Props {
  wine: Wine;
  onClose: () => void;
}
const safeUrl = (value: string | null | undefined): string | null => {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
};
const safeImageUrl = (value: string | null | undefined): string | null => {
  if (value?.startsWith("/") && !value.startsWith("//")) return value;
  return safeUrl(value);
};
const list = (value?: string[] | null) =>
  value?.filter(Boolean).join(", ") || null;

export function WineDetailSheet({ wine, onClose }: Props) {
  const roskachestvo = wine.roskachestvo;
  const source = safeUrl(wine.source_url);
  const image = safeImageUrl(wine.image_url);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section
        className="wine-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wine-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden="true" />
        <button
          className="sheet-close"
          onClick={onClose}
          aria-label="Закрыть карточку"
        >
          ×
        </button>
        <div className="wine-sheet-hero">
          <div className="wine-sheet-image">
            <span className="bottle-art bottle-art--hero" aria-hidden="true" />
            {image && (
              <img
                src={image}
                alt={`Этикетка: ${wine.name}`}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            )}
          </div>
          <div>
            <p className="eyebrow">НАЙДЕНО В КАТАЛОГЕ</p>
            <h2 id="wine-title">{wine.name}</h2>
            <p className="wine-producer">
              {wine.winery || "Винодельня не указана"}
            </p>
            <p className="wine-location">
              {[wine.region, wine.country].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <div className="rosc-card" aria-label="Информация Роскачества">
          <div className="rosc-mark">Р</div>
          <div>
            <strong>Роскачество</strong>
            {typeof roskachestvo?.score === "number" ? (
              <span>
                Оценка: {roskachestvo.score}
                {roskachestvo.year ? ` · ${roskachestvo.year}` : ""}
              </span>
            ) : (
              <span>Оценка скоро появится</span>
            )}
          </div>
        </div>
        <div className="detail-grid">
          {wine.style && (
            <div>
              <small>Стиль</small>
              <strong>{wine.style}</strong>
            </div>
          )}
          {wine.vintage && (
            <div>
              <small>Год урожая</small>
              <strong>{wine.vintage}</strong>
            </div>
          )}
          {list(wine.grapes) && (
            <div>
              <small>Виноград</small>
              <strong>{list(wine.grapes)}</strong>
            </div>
          )}
          {typeof wine.rating === "number" && (
            <div>
              <small>Народный рейтинг</small>
              <strong>{wine.rating.toFixed(1)} / 5</strong>
            </div>
          )}
        </div>
        {wine.description && (
          <div className="detail-copy">
            <h3>О вине</h3>
            <p>{wine.description}</p>
          </div>
        )}
        {list(wine.tasting_notes) && (
          <div className="detail-copy">
            <h3>Вкус и аромат</h3>
            <p>{list(wine.tasting_notes)}</p>
          </div>
        )}
        {list(wine.food_pairing) && (
          <div className="detail-copy">
            <h3>С чем сочетать</h3>
            <p>{list(wine.food_pairing)}</p>
          </div>
        )}
        {!list(wine.tasting_notes) && !list(wine.food_pairing) && (
          <p className="muted small">
            Дегустационные заметки и сочетания появятся после пополнения
            каталога.
          </p>
        )}
        {source && (
          <a
            className="text-link"
            href={source}
            target="_blank"
            rel="noopener noreferrer"
          >
            Открыть карточку на «Своё вино» ↗
          </a>
        )}
      </section>
    </div>
  );
}
