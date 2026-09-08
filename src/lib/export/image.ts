/**
 * Exports an SVG element to a high-resolution PNG image download.
 */
export async function exportSVGToPNG(svgElement: SVGSVGElement, filename: string = 'region-factible.png'): Promise<void> {
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(svgElement);

  // Ensure xmlns is present
  if (!svgString.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
    svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = (e) => reject(e);
    image.src = url;
  });

  const bbox = svgElement.getBoundingClientRect();
  const width = bbox.width || 600;
  const height = bbox.height || 450;
  const scale = 2; // High-DPI 2x

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo inicializar el contexto 2D de canvas');

  // Fill crisp white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);

  const pngUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.download = filename;
  a.href = pngUrl;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
