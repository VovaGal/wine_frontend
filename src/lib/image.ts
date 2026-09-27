export async function cropVisibleFrame(
  source: HTMLVideoElement | HTMLImageElement,
  viewport: HTMLElement,
  frame: HTMLElement,
  position = { x: 0.5, y: 0.5 },
): Promise<File> {
  const sourceWidth =
    source instanceof HTMLVideoElement
      ? source.videoWidth
      : source.naturalWidth;
  const sourceHeight =
    source instanceof HTMLVideoElement
      ? source.videoHeight
      : source.naturalHeight;
  if (!sourceWidth || !sourceHeight)
    throw new Error("Изображение ещё загружается. Попробуйте снова.");
  const view = viewport.getBoundingClientRect();
  const box = frame.getBoundingClientRect();
  let imageLeft: number;
  let imageTop: number;
  let scale: number;
  if (source instanceof HTMLImageElement) {
    // getBoundingClientRect includes CSS zoom and pan. The actual image is
    // centered inside that element because the preview uses object-fit:contain.
    const element = source.getBoundingClientRect();
    scale = Math.min(
      element.width / sourceWidth,
      element.height / sourceHeight,
    );
    imageLeft = element.left + (element.width - sourceWidth * scale) / 2;
    imageTop = element.top + (element.height - sourceHeight * scale) / 2;
  } else {
    scale = Math.max(view.width / sourceWidth, view.height / sourceHeight);
    imageLeft = view.left + (view.width - sourceWidth * scale) * position.x;
    imageTop = view.top + (view.height - sourceHeight * scale) * position.y;
  }
  const left = Math.max(box.left, imageLeft);
  const top = Math.max(box.top, imageTop);
  const right = Math.min(box.right, imageLeft + sourceWidth * scale);
  const bottom = Math.min(box.bottom, imageTop + sourceHeight * scale);
  const sx = Math.max(0, (left - imageLeft) / scale);
  const sy = Math.max(0, (top - imageTop) / scale);
  const sw = (right - left) / scale;
  const sh = (bottom - top) / scale;
  if (sw < 30 || sh < 30) throw new Error("Разместите этикетку внутри рамки.");
  const factor = Math.min(1, 1440 / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * factor);
  canvas.height = Math.round(sh * factor);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Не удалось обработать фото.");
  context.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result
          ? resolve(result)
          : reject(new Error("Не удалось сохранить кадр.")),
      "image/jpeg",
      0.88,
    );
  });
  return new File([blob], `etiketka-${Date.now()}.jpg`, { type: "image/jpeg" });
}

export function isImage(file: File) {
  return (
    file.type.startsWith("image/") &&
    file.size > 0 &&
    file.size <= 20 * 1024 * 1024
  );
}
