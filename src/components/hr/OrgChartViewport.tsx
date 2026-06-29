"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Download, Maximize2, Minus, Plus } from "lucide-react";
import { downloadBlob, exportOrgChartPng } from "@/lib/org-chart-export";

const MIN_ZOOM = 0.08;
const MAX_ZOOM = 2.5;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function OrgChartViewport({ children, exportFilename }: { children: ReactNode; exportFilename?: string }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [userAdjusted, setUserAdjusted] = useState(false);
  const [exporting, setExporting] = useState(false);
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; panX: number; panY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    panX: 0,
    panY: 0,
  });

  const fitToView = useCallback(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const cw = content.scrollWidth;
    const ch = content.scrollHeight;
    if (cw === 0 || ch === 0) return;

    const scale = clamp(Math.min(vw / cw, vh / ch) * 0.94, MIN_ZOOM, 1);
    setZoom(scale);
    setPan({
      x: (vw - cw * scale) / 2,
      y: Math.max(12, (vh - ch * scale) / 2),
    });
  }, []);

  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        if (!userAdjusted) fitToView();
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [children, userAdjusted, fitToView]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const ro = new ResizeObserver(() => {
      if (!userAdjusted) fitToView();
    });
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [userAdjusted, fitToView]);

  function zoomBy(factor: number, origin?: { x: number; y: number }) {
    setUserAdjusted(true);
    setZoom((z) => {
      const next = clamp(z * factor, MIN_ZOOM, MAX_ZOOM);
      if (origin && viewportRef.current) {
        const rect = viewportRef.current.getBoundingClientRect();
        const ox = origin.x - rect.left;
        const oy = origin.y - rect.top;
        setPan((p) => ({
          x: ox - ((ox - p.x) * next) / z,
          y: oy - ((oy - p.y) * next) / z,
        }));
      }
      return next;
    });
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    zoomBy(e.deltaY > 0 ? 0.92 : 1.08, { x: e.clientX, y: e.clientY });
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("a, button")) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    setUserAdjusted(true);
    viewportRef.current?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current.active) return;
    setPan({
      x: dragRef.current.panX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.panY + (e.clientY - dragRef.current.startY),
    });
  }

  function onPointerUp(e: React.PointerEvent) {
    dragRef.current.active = false;
    viewportRef.current?.releasePointerCapture(e.pointerId);
  }

  async function handleDownload() {
    const content = contentRef.current;
    if (!content || exporting) return;
    setExporting(true);
    try {
      const blob = await exportOrgChartPng(content);
      if (!blob) throw new Error("Export failed");
      const date = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, exportFilename ?? `kastros-org-chart-${date}.png`);
    } catch (err) {
      console.error("[org-chart] export failed", err);
      window.alert("Could not download the chart. Please try again in a moment.");
    } finally {
      setExporting(false);
    }
  }

  const zoomPct = Math.round(zoom * 100);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-kastros-sand/80 bg-white px-3 py-2 shadow-sm">
        <p className="text-xs text-kastros-sage">
          Drag to pan · scroll to zoom · click a card to open their profile
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => zoomBy(0.85)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-kastros-sand bg-kastros-cream/50 text-kastros-forest hover:bg-kastros-cream"
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-[3rem] text-center text-xs font-semibold tabular-nums text-kastros-forest">{zoomPct}%</span>
          <button
            type="button"
            onClick={() => zoomBy(1.15)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-kastros-sand bg-kastros-cream/50 text-kastros-forest hover:bg-kastros-cream"
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setUserAdjusted(false);
              requestAnimationFrame(() => fitToView());
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-kastros-sand bg-kastros-cream/50 px-2.5 py-1.5 text-xs font-semibold text-kastros-forest hover:bg-kastros-cream"
          >
            <Maximize2 className="h-3.5 w-3.5" aria-hidden />
            Fit
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleDownload()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-kastros-forest px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            {exporting ? "Saving…" : "Download"}
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="relative h-[min(72vh,780px)] min-h-[360px] cursor-grab overflow-hidden rounded-2xl border border-kastros-sand bg-gradient-to-b from-white to-kastros-cream/30 active:cursor-grabbing"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          ref={contentRef}
          className="org-tree absolute left-0 top-0 space-y-10 p-6"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            willChange: "transform",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
