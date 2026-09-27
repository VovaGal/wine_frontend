import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ScanFrame } from "../components/ScanFrame";
import { useCamera } from "../hooks/useCamera";
import { config } from "../config";
import { cropVisibleFrame, isImage } from "../lib/image";

interface Props {
  onBack: () => void;
  onReady: (file: File) => void;
}
export function Scan({ onBack, onReady }: Props) {
  const camera = useCamera();
  const viewportRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 0.5, y: 0.5 });
  const [zoom, setZoom] = useState(1);
  const demoWineRef = useRef("1");
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; distance: number } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void camera.start();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [camera.start]);
  useEffect(
    () => () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    },
    [imageUrl],
  );
  function loadFile(file?: File) {
    if (!file) return;
    if (!isImage(file)) {
      setError("Выберите фото JPG, PNG или HEIC размером до 20 МБ.");
      return;
    }
    const demoFile = /^wine[_ -]?([1-6])(?:\s*\(\d+\))?\.[^.]+$/i.exec(
      file.name,
    );
    if (config.demoMode) {
      if (!demoFile) {
        setError(
          "Для демо выберите фото с названием wine_1 … wine_6 (JPG, PNG или WebP).",
        );
        return;
      }
      demoWineRef.current = demoFile[1];
    }
    setError("");
    setPosition({ x: 0.5, y: 0.5 });
    setZoom(1);
    camera.stop();
    setImageUrl(URL.createObjectURL(file));
  }
  async function capture() {
    const source = imageUrl ? imageRef.current : camera.videoRef.current;
    if (!source || !viewportRef.current || !frameRef.current) return;
    setBusy(true);
    setError("");
    try {
      const cropped = await cropVisibleFrame(
        source,
        viewportRef.current,
        frameRef.current,
        imageUrl ? position : undefined,
      );
      camera.stop();
      // The local demo pins the choice to this task, even if the URL changes.
      onReady(
        config.demoMode
          ? new File([cropped], `demo-wine-${demoWineRef.current}.jpg`, {
              type: cropped.type,
            })
          : cropped,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Не удалось подготовить фото.",
      );
    } finally {
      setBusy(false);
    }
  }
  function reset() {
    setImageUrl(null);
    setError("");
    demoWineRef.current = "1";
    void camera.start();
  }
  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));
  function currentGesture() {
    const points = [...pointers.current.values()];
    if (!points.length) return null;
    if (points.length === 1)
      return { x: points[0].x, y: points[0].y, distance: 0 };
    const [a, b] = points;
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      distance: Math.hypot(a.x - b.x, a.y - b.y),
    };
  }
  function endGesture(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    pointers.current.delete(event.pointerId);
    gesture.current = currentGesture();
  }
  function panBy(dx: number, dy: number) {
    const view = viewportRef.current;
    if (!view) return;
    setPosition((previous) => ({
      x: clamp(previous.x - dx / (view.clientWidth * 0.8), 0, 1),
      y: clamp(previous.y - dy / (view.clientHeight * 0.8), 0, 1),
    }));
  }
  function moveGesture(event: ReactPointerEvent<HTMLDivElement>) {
    if (!imageUrl || !pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const now = currentGesture();
    const before = gesture.current;
    if (now && before) {
      panBy(now.x - before.x, now.y - before.y);
      if (now.distance && before.distance) {
        setZoom((previous) =>
          clamp((previous * now.distance) / before.distance, 0.4, 3),
        );
      }
    }
    gesture.current = now;
  }

  return (
    <main className="scan-page">
      <header className="scan-header">
        <button className="round-back" onClick={onBack} aria-label="Вернуться">
          ←
        </button>
        <span>Сканирование этикетки</span>
        <span className="header-step">01 / 02</span>
      </header>
      <div className="scan-intro">
        <p className="eyebrow">НАЙДЁМ ВАШЕ ВИНО</p>
        <h1>
          Поместите
          <br />
          <em>этикетку в кадр</em>
        </h1>
        <p>Поместите основную этикетку целиком в светлую рамку.</p>
      </div>
      <div
        className={imageUrl ? "gallery-gesture-area" : undefined}
        onPointerDown={(event) => {
          if (!imageUrl) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
          });
          gesture.current = currentGesture();
        }}
        onPointerMove={moveGesture}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
      >
        <ScanFrame
          viewportRef={viewportRef}
          frameRef={frameRef}
          position={position}
        >
          <video
            ref={camera.videoRef}
            className="scanner-media"
            autoPlay
            muted
            playsInline
            aria-label="Изображение с камеры"
            style={{ display: imageUrl ? "none" : "block" }}
          />
          {imageUrl && (
            <img
              ref={imageRef}
              src={imageUrl}
              className="scanner-media scanner-media--gallery"
              alt="Предпросмотр выбранной этикетки"
              draggable={false}
              style={{
                transform: `translate(${(0.5 - position.x) * 80}%, ${(0.5 - position.y) * 80}%) scale(${zoom})`,
              }}
            />
          )}
          {!imageUrl && camera.state !== "ready" && (
            <div className="camera-waiting">
              <span aria-hidden="true">◎</span>
              <p>
                {camera.state === "starting"
                  ? "Открываем камеру…"
                  : "Камера пока не открыта"}
              </p>
            </div>
          )}
        </ScanFrame>
      </div>
      <div className="scan-actions">
        {imageUrl ? (
          <>
            <p className="position-hint">
              Уменьшите масштаб, чтобы этикетка поместилась в рамку. Затем
              сдвиньте фотографию при необходимости.
            </p>
            <label className="slider-label">
              Масштаб · {Math.round(zoom * 100)}%{" "}
              <input
                aria-label="Масштаб фото"
                type="range"
                min="0.4"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </label>
            <label className="slider-label">
              По горизонтали{" "}
              <input
                aria-label="Сдвиг фото по горизонтали"
                type="range"
                min="0"
                max="100"
                value={position.x * 100}
                onChange={(e) =>
                  setPosition((p) => ({
                    ...p,
                    x: Number(e.target.value) / 100,
                  }))
                }
              />
            </label>
            <label className="slider-label">
              По вертикали{" "}
              <input
                aria-label="Сдвиг фото по вертикали"
                type="range"
                min="0"
                max="100"
                value={position.y * 100}
                onChange={(e) =>
                  setPosition((p) => ({
                    ...p,
                    y: Number(e.target.value) / 100,
                  }))
                }
              />
            </label>
          </>
        ) : (
          camera.message && (
            <p className="camera-message" role="status">
              {camera.message}
            </p>
          )
        )}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <button
          className="button button--primary scan-submit"
          onClick={() => void capture()}
          disabled={busy || (camera.state !== "ready" && !imageUrl)}
        >
          {busy
            ? "Готовим фото…"
            : imageUrl
              ? "Распознать это вино ↗"
              : "Сделать снимок ◎"}
        </button>
        <div className="scan-secondary">
          {imageUrl ? (
            <button className="text-button" onClick={reset}>
              Переснять
            </button>
          ) : (
            <button className="text-button" onClick={() => void camera.start()}>
              {camera.state === "unavailable"
                ? "Повторить попытку"
                : "Открыть камеру"}
            </button>
          )}
          <span aria-hidden="true">·</span>
          <button
            className="text-button"
            onClick={() => fileInputRef.current?.click()}
          >
            Выбрать из галереи
          </button>
        </div>
        {!imageUrl && camera.state === "unavailable" && (
          <button
            className="quiet-button"
            onClick={() => nativeInputRef.current?.click()}
          >
            Снять через камеру телефона
          </button>
        )}
        <input
          ref={fileInputRef}
          hidden
          type="file"
          accept="image/*"
          onChange={(e) => {
            loadFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={nativeInputRef}
          hidden
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            loadFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <p className="muted small scan-tip">
          Подсказка: не закрывайте название пальцем и избегайте сильных бликов.
        </p>
      </div>
    </main>
  );
}
