// api/excel.ts
import { put, head } from '@vercel/blob';

const EXCEL_PATH = 'merceria.xlsx';
const EXCEL_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      try {
        const meta = await head(EXCEL_PATH); // si no existe, lanza error
        const url = (meta as any).downloadUrl ?? (meta as any).url;
        const fileRes = await fetch(url);
        if (!fileRes.ok) return res.status(502).send('Blob fetch failed');
        const ab = await fileRes.arrayBuffer();
        res.setHeader('Content-Type', EXCEL_MIME);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).send(Buffer.from(ab));
      } catch {
        return res.status(404).send('Not Found');
      }
    }

    if (req.method === 'PUT') {
      const chunks: any[] = [];
      req.on('data', (d: any) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
      req.on('end', async () => {
        const buf = Buffer.concat(chunks as Buffer[]);
        const blob = new Blob([buf], { type: EXCEL_MIME });
        await put(EXCEL_PATH, blob, {
          access: 'private',
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: EXCEL_MIME,
        });
        return res.status(204).end();
      });
      return;
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).end('Method Not Allowed');
  } catch (e) {
    console.error(e);
    return res.status(500).send('Internal Error');
  }
}