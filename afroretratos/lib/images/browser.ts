/**
 * Recorte e redimensionamento acontecem no navegador: o servidor nao tem
 * biblioteca de imagem (o runtime do container nao inclui o sharp) e o payload
 * chega pequeno e previsivel no banco.
 */

export function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem."));
    };
    image.src = url;
  });
}

/** JPEC com fundo opaco: PNG transparente viraria preto no JPEG. */
export function canvasToJpegDataUrl(
  canvas: HTMLCanvasElement,
  quality = 0.85,
): string {
  const context = canvas.getContext("2d");
  if (context) {
    context.save();
    context.globalCompositeOperation = "destination-over";
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
  }
  return canvas.toDataURL("image/jpeg", quality);
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}
