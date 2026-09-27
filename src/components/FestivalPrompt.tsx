import { config } from "../config";

interface Props {
  onClose: () => void;
  eligible: boolean;
}
export function FestivalPrompt({ onClose, eligible }: Props) {
  return (
    <div className="sheet-backdrop festival-backdrop" onClick={onClose}>
      <section
        className="festival-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="festival-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="sheet-close"
          onClick={onClose}
          aria-label="Закрыть приглашение"
        >
          ×
        </button>
        <span className="festival-flower" aria-hidden="true">
          ✳
        </span>
        <p className="eyebrow">
          {config.demoMode
            ? "ЕЩЁ ОДИН ПОВОД ОТКРЫТЬ НОВОЕ"
            : "ЕЩЁ ОДИН ПОВОД ОТКРЫТЬ НОВОЕ"}
        </p>
        <h2 id="festival-title">Встречаемся на винном фестивале?</h2>
        <p>
          {config.demoMode
            ? "Это вино отмечено участником фестиваля. Узнайте о событии подробнее."
            : eligible
              ? "Это вино отмечено участником фестиваля. Узнайте о событии подробнее."
              : "Узнайте больше о событии и российских винодельнях."}
        </p>
        <a
          className="button button--primary"
          href={config.festivalUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
        >
          Узнать о фестивале ↗
        </a>
        <button className="quiet-button" onClick={onClose}>
          Позже
        </button>
      </section>
    </div>
  );
}
