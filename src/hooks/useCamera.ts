import { useCallback, useEffect, useRef, useState } from "react";

type CameraState = "idle" | "starting" | "ready" | "unavailable";

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const [state, setState] = useState<CameraState>("idle");
  const [message, setMessage] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const release = useCallback(() => {
    generation.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const stop = useCallback(() => {
    release();
    setState("idle");
    setMessage("");
  }, [release]);

  const start = useCallback(
    async (deviceId?: string) => {
      if (
        streamRef.current
          ?.getVideoTracks()
          .some((track) => track.readyState === "live")
      )
        return;
      if (streamRef.current) release();
      const request = ++generation.current;
      if (!navigator.mediaDevices?.getUserMedia) {
        setState("unavailable");
        setMessage(
          "Камера недоступна. Откройте страницу по HTTPS или загрузите фото.",
        );
        return;
      }
      setState("starting");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: deviceId
            ? { deviceId: { exact: deviceId } }
            : { facingMode: { ideal: "environment" } },
        });
        if (request !== generation.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) throw new Error("Видеоэлемент ещё не готов.");
        video.srcObject = stream;
        let timeout: number | undefined;
        try {
          await Promise.race([
            video.play(),
            new Promise<never>((_, reject) => {
              timeout = window.setTimeout(
                () =>
                  reject(
                    new Error("Камера не начала воспроизведение за 8 секунд."),
                  ),
                8000,
              );
            }),
          ]);
        } finally {
          window.clearTimeout(timeout);
        }
        if (request !== generation.current) return;
        try {
          const available = await navigator.mediaDevices.enumerateDevices();
          if (request === generation.current)
            setDevices(available.filter((item) => item.kind === "videoinput"));
        } catch {
          /* Device labels may be unavailable in this browser. */
        }
        if (request !== generation.current) return;
        setState("ready");
        setMessage("");
      } catch (error) {
        if (request !== generation.current) return;
        release();
        try {
          const available = await navigator.mediaDevices.enumerateDevices();
          if (request === generation.current)
            setDevices(available.filter((item) => item.kind === "videoinput"));
        } catch {
          /* The gallery remains available. */
        }
        if (request !== generation.current) return;
        setState("unavailable");
        const name = error instanceof DOMException ? error.name : "";
        setMessage(
          name === "NotReadableError"
            ? "Камера занята другой программой или недоступна системе. Закройте её там и попробуйте снова."
            : name === "NotAllowedError"
              ? "Доступ к камере запрещён. Проверьте разрешение сайта и настройки Windows."
              : name === "NotFoundError" || name === "OverconstrainedError"
                ? "Выбранная камера не найдена. Выберите другую камеру ниже."
                : `Не удалось открыть камеру${name ? ` (${name})` : ""}: ${error instanceof Error ? error.message : "проверьте подключение и попробуйте снова."}`,
        );
      }
    },
    [release],
  );

  useEffect(() => () => release(), [release]);

  return { videoRef, state, message, devices, start, stop };
}
