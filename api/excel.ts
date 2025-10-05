// api/excel.ts
import { put, head } from '@vercel/blob';

const EXCEL_PATH = 'merceria.xlsx';
const EXCEL_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Devuelve el Excel actual (si existe) proxyeando el contenido binario
export async function GET() {
  try {
    const meta = await head(EXCEL_PATH); // si no existe, lanza BlobNotFoundError
    const fileRes = await fetch(meta.downloadUrl || meta.url);
    if (!fileRes.ok) return new Response('Blob fetch failed', { status: 502 });
    return new Response(fileRes.body, {
      status: 200,
      headers: {
        'Content-Type': EXCEL_MIME,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new Response('Not Found', { status: 404 });
  }
}

// Sube/sobrescribe el Excel
export async function PUT(request: Request) {
  const ab = await request.arrayBuffer();
  const blob = new Blob([ab], { type: EXCEL_MIME });

  await put(EXCEL_PATH, blob, {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true, // importante para re-escribir
    contentType: EXCEL_MIME,
  });

  return new Response(null, { status: 204 });
}