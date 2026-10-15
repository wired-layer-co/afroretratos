import { getEventImageData } from "@/services/event-images";

export const dynamic = "force-dynamic";

/**
 * Serve os bytes de uma foto de evento. Fica em /api (mesma origem), entao
 * passa pelo CSP `img-src 'self'` sem liberar host externo. O id nunca muda de
 * conteudo (substituir a capa cria outra linha), entao o cache e eterno.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const image = await getEventImageData(id);

  if (!image) {
    return new Response("Foto não encontrada", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(Buffer.from(image.data, "base64"), {
    headers: {
      "content-type": image.mime,
      "content-length": String(Buffer.from(image.data, "base64").byteLength),
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
