import { useState, useEffect, type FormEvent } from "react";
import { submitMissingWine } from "../api/feedback";
import { config } from "../config";
import type { MissingWineSubmission } from "../types";

const DRAFT_KEY = "svoe-vino:missing-draft";
interface Props {
  taskId: string | null;
  uploadedImageId: number | null;
  ocrLines?: Array<{ text: string }>;
}
export function MissingWineForm({ taskId, uploadedImageId, ocrLines }: Props) {
  const [form, setForm] = useState<MissingWineSubmission>({
    task_id: taskId,
    uploaded_image_id: uploadedImageId,
    name: "", // or clear the "ocrLines?.[0]?.text ??" for clear name entry every time
    winery: "",
    region: "",
    vintage: "",
    tried: false,
    rating: null,
    consent: false,
  });
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  // useEffect(() => {
  //   try {
  //     const saved = sessionStorage.getItem(DRAFT_KEY);
  //     if (saved) {
  //       const draft = JSON.parse(saved) as Partial<MissingWineSubmission>;
  //       setForm((previous) => ({
  //         ...previous,
  //         ...draft,
  //         task_id: taskId,
  //         uploaded_image_id: uploadedImageId,
  //         consent: false,
  //       }));
  //     }
  //   } catch {
  //     /* Ignore an invalid old draft. */
  //   }
  // }, [taskId, uploadedImageId]);
  const change = (
    key: keyof MissingWineSubmission,
    value: string | number | boolean | null,
  ) => setForm((previous) => ({ ...previous, [key]: value }));
  const saveDraft = () => {
    try {
      // Consent is never persisted; the image already belongs to the task.
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ ...form, consent: false }),
      );
      setNotice(
        "Черновик сохранён на этом устройстве. Заявка ещё не отправлена.",
      );
    } catch {
      setNotice("Не получилось сохранить черновик в браузере.");
    }
  };
  const restoreDraft = () => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (!saved) return;

      const draft = JSON.parse(saved) as Partial<MissingWineSubmission>;
      setForm((previous) => ({
        ...previous,
        ...draft,
        task_id: taskId,
        uploaded_image_id: uploadedImageId,
        consent: false,
      }));
      setNotice("Черновик восстановлен.");
    } catch {
      setNotice("Не получилось восстановить черновик.");
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.consent) return;
    setBusy(true);
    setNotice("");
    try {
      await submitMissingWine(form);
      sessionStorage.removeItem(DRAFT_KEY);
      setNotice("Спасибо! Информация отправлена на проверку.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Ошибка отправки.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="missing-panel" aria-labelledby="missing-heading">
      <p className="eyebrow">ПОМОГИТЕ НАМ СТАТЬ ЛУЧШЕ</p>
      <h2 id="missing-heading">Похоже, этого вина пока нет в нашей базе</h2>
      <p>
        Фото этикетки уже загружено для распознавания. Заполните известные вам
        детали — так будет проще добавить вино в каталог.
      </p>
      <form onSubmit={submit} className="missing-form">
        <label>
          Название вина <span aria-hidden="true">*</span>
          <input
            required
            autoComplete="off"
            maxLength={120}
            value={form.name}
            onChange={(e) => change("name", e.target.value)}
            placeholder="Например, Пино Нуар Резерв"
          />
        </label>
        <div className="form-split">
          <label>
            Винодельня
            <input
              maxLength={100}
              value={form.winery}
              onChange={(e) => change("winery", e.target.value)}
              placeholder="Название"
            />
          </label>
          <label>
            Год
            <input
              inputMode="numeric"
              maxLength={4}
              pattern="[0-9]{4}"
              value={form.vintage}
              onChange={(e) => change("vintage", e.target.value)}
              placeholder="2024"
            />
          </label>
        </div>
        <label>
          Регион
          <input
            maxLength={80}
            value={form.region}
            onChange={(e) => change("region", e.target.value)}
            placeholder="Например, Кубань"
          />
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={form.tried}
            onChange={(e) => {
              change("tried", e.target.checked);
              if (!e.target.checked) change("rating", null);
            }}
          />
          Я уже пробовал(а) это вино
        </label>
        {form.tried && (
          <fieldset className="rating-select">
            <legend>Как вам вино?</legend>
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                className={form.rating === rating ? "selected" : ""}
                onClick={() => change("rating", rating)}
                aria-label={`${rating} из 5`}
              >
                {rating} ★
              </button>
            ))}
          </fieldset>
        )}
        {config.feedbackEnabled && (
          <label className="checkbox-row">
            <input
              required
              type="checkbox"
              checked={form.consent}
              onChange={(e) => change("consent", e.target.checked)}
            />
            Согласен(на) отправить сведения о вине и загруженное фото для
            проверки каталога
          </label>
        )}
        {notice && (
          <p className="form-notice" role="status">
            {notice}
          </p>
        )}
        {config.feedbackEnabled ? (
          <button
            disabled={busy}
            className="button button--primary"
            type="submit"
          >
            {busy ? "Отправляем…" : "Отправить на проверку"}
          </button>
        ) : (
          <button
            className="button button--primary"
            type="button"
            onClick={saveDraft}
          >
            Сохранить черновик
          </button>
        )}
        {!config.feedbackEnabled && (
          <button
            className="button button--outline"
            type="button"
            onClick={restoreDraft}
          >
            Восстановить черновик
          </button>
        )}

        {!config.feedbackEnabled && (
          <p className="muted small">
            Приём заявок ещё подключается. Черновик остаётся в этом браузере и
            не отправляется на сервер.
          </p>
        )}
      </form>
    </section>
  );
}
