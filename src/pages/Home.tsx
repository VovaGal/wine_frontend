import { useEffect, useState } from "react";
import { showcaseWines } from "../data/popularWines";
import { loadDemoWines } from "../data/demoRecognition";
import { SommelierPlaceholder } from "../components/SommelierPlaceholder";
import { config } from "../config";
import type { Wine } from "../types";

interface Props {
  onScan: () => void;
}
export function Home({ onScan }: Props) {
  const [demoWines, setDemoWines] = useState<Wine[]>([]);
  const [demoError, setDemoError] = useState("");
  useEffect(() => {
    if (!config.demoMode) return;
    const controller = new AbortController();
    loadDemoWines(controller.signal)
      .then(setDemoWines)
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setDemoError(
            error instanceof Error
              ? error.message
              : "Не удалось прочитать демонстрационный каталог.",
          );
      });
    return () => controller.abort();
  }, []);
  const cards =
    config.demoMode && demoWines.length
      ? demoWines.slice(0, 3).map((wine, index) => ({
          name: wine.name,
          winery: wine.winery,
          region: wine.region,
          kind: wine.style || "Вино",
          tint: ["gold", "rose", "cream"][index],
          image_url: wine.image_url,
        }))
      : showcaseWines.map((wine) => ({ ...wine, image_url: null }));
  return (
    <main className="home-page">
      <header className="site-header">
        <div className="brand-lockup">
          <span className="brand-symbol" aria-hidden="true">
            <img src="/brand/svoe-vino-logo.svg" alt="" />
          </span>
          {/* <div className="brand-mark">
            <span>СВОЁ</span>
            <span>ВИНО</span>
          </div> */}
        </div>
        <span className="header-label">
          {config.demoMode ? "ДЕМО-РЕЖИМ" : "Сканер этикеток"}
        </span>
      </header>
      <section className="home-hero">
        <div className="hero-orbit" aria-hidden="true">
          <span className="hero-bottle" />
        </div>
        <p className="eyebrow hero-eyebrow">
          ТВОЁ ЗНАКОМСТВО С РОССИЙСКИМ ВИНОМ
        </p>
        <h1>
          У каждой
          <br />
          этикетки
          <br />
          <em>своя история.</em>
        </h1>
        <p className="hero-description">
          Наведите камеру на бутылку — узнаем вино, его характер и откуда оно
          родом.
        </p>
        <button className="button button--primary hero-button" onClick={onScan}>
          <span className="camera-icon" aria-hidden="true">
            ◎
          </span>{" "}
          Сканировать этикетку <span aria-hidden="true">↗</span>
        </button>
        <p className="hero-hint">
          Или загрузите фото из галереи на следующем шаге
        </p>
      </section>
      <section className="discovery" aria-labelledby="discovery-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ВДОХНОВЕНИЕ ДНЯ</p>
            <h2 id="discovery-heading">Откройте российское</h2>
          </div>
          <span className="section-spark" aria-hidden="true">
            ✳
          </span>
        </div>
        <p className="section-subtitle">
          Несколько вин для знакомства с каталогом
        </p>
        {demoError && (
          <p className="camera-message demo-error" role="alert">
            {demoError}
          </p>
        )}
        <div className="wine-carousel">
          {cards.map((wine, index) => (
            <article
              className={`discovery-card discovery-card--${wine.tint}`}
              key={wine.name}
            >
              <span className="discovery-card-number">0{index + 1} / 03</span>
              <span className="discovery-bottle" aria-hidden="true">
                <i />
              </span>
              {wine.image_url && (
                <img
                  className="discovery-photo"
                  src={wine.image_url}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              )}
              <div className="discovery-card-text">
                <small>{wine.kind}</small>
                <h3>{wine.name}</h3>
                <p>
                  {wine.winery} · {wine.region}
                </p>
              </div>
            </article>
          ))}
        </div>
        <p className="muted small showcase-note">
          Подборка для демонстрации интерфейса. Рейтинги и популярность здесь не
          заявлены.
        </p>
      </section>
      <div className="home-secondary">
        <SommelierPlaceholder />
      </div>
      <footer className="app-footer">
        <img src="/brand/rshb-logo.svg" alt="РСХБ" />
        <img src="/brand/eighteen-plus.svg" alt="18+" />
      </footer>
    </main>
  );
}
