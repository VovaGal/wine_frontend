import type { RefObject } from "react";

interface Props {
  viewportRef: RefObject<HTMLDivElement | null>;
  frameRef: RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
  position?: { x: number; y: number };
}

export function ScanFrame({
  viewportRef,
  frameRef,
  children,
  position,
}: Props) {
  return (
    <div
      className="scanner-viewport"
      ref={viewportRef}
      style={
        {
          "--object-x": `${(position?.x ?? 0.5) * 100}%`,
          "--object-y": `${(position?.y ?? 0.5) * 100}%`,
        } as React.CSSProperties
      }
    >
      {children}
      <div className="scan-veil scan-veil--top" aria-hidden="true" />
      <div className="scan-veil scan-veil--left" aria-hidden="true" />
      <div className="scan-veil scan-veil--right" aria-hidden="true" />
      <div className="scan-veil scan-veil--bottom" aria-hidden="true" />
      <div className="scan-focus" ref={frameRef} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="scan-focus-caption">ЭТИКЕТКА — ВНУТРИ РАМКИ</div>
    </div>
  );
}
