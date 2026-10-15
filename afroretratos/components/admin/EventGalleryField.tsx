"use client";

import { useRef, useState } from "react";
import { addEventImageAction } from "@/app/admin/(painel)/eventos/image-actions";
import { FilePicker } from "@/components/admin/FilePicker";
import { canvasToJpegDataUrl, isImageFile, loadImageFile } from "@/lib/images/browser";

const MAX_SIDE = 1600;

const HINT = "mt-1 text-xs text-brown-raised";

/** Redimensiona no navegador para o carrossel nao carregar foto de celular. */
async function toUploadableDataUrl(file: File): Promise<string> {
  const image = await loadImageFile(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a imagem.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvasToJpegDataUrl(canvas);
}

/**
 * Fotos do carrossel. Cada arquivo e reduzido no navegador e enviado em uma
 * acao propria, para o corpo da requisicao ficar pequeno.
 */
export function EventGalleryField({
  eventId,
  remaining,
  used,
}: {
  eventId: string;
  remaining: number;
  used: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setError(null);
    setOk(null);

    const chosen = Array.from(files);
    const accepted = chosen.filter(isImageFile);

    if (accepted.length === 0) {
      setError("Escolha arquivos de imagem.");
      return;
    }
    if (accepted.length > remaining) {
      setError(
        `Cabem mais ${remaining} ${remaining === 1 ? "foto" : "fotos"}. Nada foi enviado.`,
      );
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setBusy(true);
    let saved = 0;
    try {
      for (const file of accepted) {
        const dataUrl = await toUploadableDataUrl(file);
        const formData = new FormData();
        formData.set("eventId", eventId);
        formData.set("image", dataUrl);
        const result = await addEventImageAction(formData);
        if (result?.error) {
          setError(result.error);
          break;
        }
        saved += 1;
      }
      if (saved > 0) {
        setOk(saved === 1 ? "Foto adicionada." : `${saved} fotos adicionadas.`);
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Não foi possível enviar a foto.",
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mt-8 border-t border-brown-deep/20 pt-6">
      <h3 className="font-subtitle text-xl">
        Fotos do carrossel ({used} de {used + remaining})
      </h3>
      <p className={HINT}>
        Até 3 fotos, exibidas antes dos relatos na página do evento. JPG, PNG ou
        WebP; a imagem é reduzida automaticamente.
      </p>

      {remaining > 0 ? (
        <FilePicker
          id="gallery-file"
          name="gallery"
          label="Escolher fotos"
          multiple
          disabled={busy}
          inputRef={inputRef}
          onChange={(event) => void upload(event.target.files)}
          statusText="Até 3 fotos por evento"
        />
      ) : (
        <p className="mt-4 text-sm text-brown-raised">
          Limite de 3 fotos atingido. Remova uma para enviar outra.
        </p>
      )}

      <p aria-live="polite" className="mt-3 min-h-5 text-xs">
        {busy ? (
          <span className="text-brown-raised">Enviando…</span>
        ) : error ? (
          <span className="text-wine">{error}</span>
        ) : ok ? (
          <span className="font-medium text-olive-deep">{ok}</span>
        ) : null}
      </p>
    </div>
  );
}
