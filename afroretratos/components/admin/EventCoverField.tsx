"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  removeEventCoverAction,
  saveEventCoverAction,
} from "@/app/admin/(painel)/eventos/image-actions";
import { EventCover } from "@/components/events/EventCover";
import { FilePicker } from "@/components/admin/FilePicker";
import { canvasToJpegDataUrl, isImageFile, loadImageFile } from "@/lib/images/browser";

// A previa do painel reproduz o site: o cartao renderiza a composicao na
// largura de referencia do desktop e reduz com transform, mantendo as
// proporcoes exatas (as barras sao % da largura, o icone tambem).
const SITE_REFERENCE_WIDTH = 1440;

// A capa publica com foto tem 2:1 (ver EventCover), entao o recorte ja sai nesse formato.
const CROP_WIDTH = 1200;
const CROP_HEIGHT = 600;

const HINT = "mt-1 text-xs text-brown-raised";
const LABEL = "text-xs font-medium tracking-[0.08em] text-brown-deep uppercase";
const BUTTON_PRIMARY =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-wine px-5 py-2.5 text-xs font-medium tracking-[0.08em] text-beige uppercase transition-colors hover:bg-wine-deep disabled:cursor-not-allowed disabled:opacity-60";
const BUTTON_QUIET =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-brown-deep/40 px-4 py-2.5 text-xs font-medium tracking-[0.08em] uppercase transition-colors hover:bg-brown-deep hover:text-beige";

/**
 * Capa do evento: o arquivo enviado aqui e recortado na moldura 2:1 e vira a
 * capa da pagina publica. O recorte e a reducao acontecem no navegador.
 */
export function EventCoverField({
  eventId,
  slug,
  title,
  dateLine,
  placeLine,
  coverUrl,
  urlValue,
}: {
  eventId: string;
  slug: string;
  title: string;
  dateLine: string;
  placeLine: string;
  coverUrl: string | null;
  urlValue: string | null;
}) {
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 0.5, y: 0.5 });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewBoxRef = useRef<HTMLDivElement | null>(null);
  const previewInnerRef = useRef<HTMLDivElement | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewHeight, setPreviewHeight] = useState<number | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    from: { x: number; y: number };
  } | null>(null);

  const hasCover = Boolean(source || coverUrl || urlValue);

  /** Escala que preenche a moldura sem deixar vazio. */
  const geometry = useCallback((image: HTMLImageElement, currentZoom: number) => {
    const scale =
      Math.max(CROP_WIDTH / image.naturalWidth, CROP_HEIGHT / image.naturalHeight) *
      currentZoom;
    return {
      width: image.naturalWidth * scale,
      height: image.naturalHeight * scale,
    };
  }, []);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, CROP_WIDTH, CROP_HEIGHT);
    if (!source) return;

    const { width, height } = geometry(source, zoom);
    context.drawImage(
      source,
      (CROP_WIDTH - width) * center.x,
      (CROP_HEIGHT - height) * center.y,
      width,
      height,
    );
  }, [center.x, center.y, geometry, source, zoom]);

  useEffect(() => {
    paint();
  }, [paint]);

  /**
   * Ajusta a escala da previa da composicao gerada sempre que a caixa (ou o
   * conteudo) mudar de tamanho.
   */
  useEffect(() => {
    const box = previewBoxRef.current;
    const inner = previewInnerRef.current;
    if (!box || !inner) return;

    const update = () => {
      // Painel escondido mede 0: mantem o ultimo valor ate ficar visivel.
      if (box.clientWidth === 0) return;
      const scale = box.clientWidth / SITE_REFERENCE_WIDTH;
      setPreviewScale(scale);
      setPreviewHeight(inner.offsetHeight * scale);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(box);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [source, coverUrl, urlValue, slug, title, dateLine, placeLine]);

  function clamp(value: number): number {
    return Math.min(1, Math.max(0, value));
  }

  async function pick(file: File | undefined) {
    setError(null);
    setOk(null);
    if (!file) return;
    if (!isImageFile(file)) {
      setError("Escolha um arquivo de imagem.");
      return;
    }
    try {
      const image = await loadImageFile(file);
      setSource(image);
      setFileName(file.name);
      setZoom(1);
      setCenter({ x: 0.5, y: 0.5 });
    } catch {
      setError("Não foi possível ler a imagem.");
    }
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!source) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    dragRef.current = { startX: event.clientX, startY: event.clientY, from: { ...center } };
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas || !source) return;

    // Movimento do ponteiro convertido para unidades da moldura.
    const ratio = CROP_WIDTH / canvas.getBoundingClientRect().width;
    const dx = (event.clientX - drag.startX) * ratio;
    const dy = (event.clientY - drag.startY) * ratio;
    const { width, height } = geometry(source, zoom);
    const roomX = width - CROP_WIDTH;
    const roomY = height - CROP_HEIGHT;

    setCenter({
      x: roomX > 1 ? clamp(drag.from.x - dx / roomX) : 0.5,
      y: roomY > 1 ? clamp(drag.from.y - dy / roomY) : 0.5,
    });
  }

  function onPointerUp() {
    dragRef.current = null;
    setDragging(false);
  }

  function saveFile() {
    const canvas = canvasRef.current;
    if (!canvas || !source) {
      setError("Escolha uma imagem antes de salvar.");
      return;
    }
    const formData = new FormData();
    formData.set("eventId", eventId);
    formData.set("image", canvasToJpegDataUrl(canvas));

    startTransition(async () => {
      const result = await saveEventCoverAction(formData);
      if (result?.error) {
        setError(result.error);
        setOk(null);
        return;
      }
      setError(null);
      setOk(result?.ok ?? "Capa atualizada.");
      setSource(null);
      setFileName("");
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function removeCover() {
    const formData = new FormData();
    formData.set("eventId", eventId);
    startTransition(async () => {
      await removeEventCoverAction(formData);
      // Limpa tambem a escolha pendente: sem isso a previa continuaria na tela.
      setSource(null);
      setFileName("");
      setZoom(1);
      setCenter({ x: 0.5, y: 0.5 });
      if (inputRef.current) inputRef.current.value = "";
      setError(null);
      setOk("Capa removida.");
    });
  }

  return (
    <div>
      <h3 className="font-subtitle text-xl">Capa</h3>
      <p className={HINT}>
        Sem capa, o evento usa a composição gerada com as cores da marca. Envie
        uma foto e enquadre na moldura 2:1: a prévia acima mostra o resultado.
      </p>

      <div className="mt-4 grid gap-6">
        <div>
          {source ? (
            <div
              className={`relative overflow-hidden border border-brown-deep/30 bg-beige ${
                dragging ? "cursor-grabbing" : "cursor-grab"
              }`}
            >
              <canvas
                ref={canvasRef}
                width={CROP_WIDTH}
                height={CROP_HEIGHT}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="block h-auto w-full touch-none select-none"
                aria-label="Pré-visualização da capa"
              />
            </div>
          ) : (
            <div
              ref={previewBoxRef}
              className="relative overflow-hidden border border-brown-deep/30"
              style={previewHeight ? { height: previewHeight } : undefined}
            >
              {coverUrl || urlValue ? (
                <div className="relative aspect-[2/1]">
                  <Image
                    src={coverUrl ?? (urlValue as string)}
                    alt="Capa atual do evento"
                    fill
                    sizes="(max-width: 1024px) 100vw, 640px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                // A composicao gerada e renderizada na largura do site e reduzida
                // por transform: as proporcoes ficam identicas as da pagina.
                <div
                  ref={previewInnerRef}
                  className="absolute top-0 left-0 origin-top-left"
                  style={{
                    width: SITE_REFERENCE_WIDTH,
                    transform: `scale(${previewScale})`,
                  }}
                >
                  <EventCover
                    slug={slug}
                    title={title}
                    dateLine={dateLine}
                    placeLine={placeLine}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          )}

          {source ? (
            <div className="mt-3">
              <label htmlFor="cover-zoom" className={LABEL}>
                Zoom
              </label>
              <input
                id="cover-zoom"
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="mt-2 w-full accent-wine"
              />
              <p className={HINT}>
                {fileName}. Arraste na imagem para escolher o recorte.
              </p>
            </div>
          ) : null}

          <p className="mt-3 text-xs text-brown-raised">
            {coverUrl
              ? "Capa atual: foto enviada pelo painel."
              : urlValue
                ? "Capa atual: imagem definida no código do site."
                : "Capa atual: composição gerada. A prévia acima é o que o site mostra."}
          </p>
        </div>

        <div>
          <p className={LABEL}>Enviar capa</p>
          <FilePicker
            id="cover-file"
            name="cover"
            label="Escolher imagem"
            inputRef={inputRef}
            onChange={(event) => void pick(event.target.files?.[0])}
            statusText={fileName ? `Selecionada: ${fileName}` : "Nenhuma imagem selecionada"}
          />
          <p className={HINT}>
            JPG, PNG ou WebP de até 2,5 MB. O site corta na moldura 2:1.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveFile}
              disabled={pending || !source}
              className={BUTTON_PRIMARY}
            >
              {pending ? "Salvando…" : "Salvar capa"}
            </button>
            {source ? (
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setCenter({ x: 0.5, y: 0.5 });
                }}
                className={BUTTON_QUIET}
              >
                Reenquadrar
              </button>
            ) : null}
            {hasCover ? (
              <button
                type="button"
                onClick={removeCover}
                disabled={pending}
                className={BUTTON_QUIET}
              >
                {pending ? "Removendo…" : "Remover capa"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <p aria-live="polite" className="mt-4 min-h-5 text-xs">
        {error ? (
          <span className="text-wine">{error}</span>
        ) : ok ? (
          <span className="font-medium text-olive-deep">{ok}</span>
        ) : null}
      </p>
    </div>
  );
}
