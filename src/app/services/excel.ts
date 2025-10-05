import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, head } from '@vercel/blob';

const EXCEL_PATH = 'merceria.xlsx';
const EXCEL_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      // ¿existe el blob?
      try {
        const meta = await head(EXCEL_PATH); // si no existe, lanza error
        const fileRes = await fetch((meta as any).downloadUrl ?? (meta as any).url);
        if (!fileRes.ok) {
          res.status(502).send('Blob fetch failed');
          return;
        }
        res.setHeader('Content-Type', EXCEL_MIME);
        res.setHeader('Cache-Control', 'no-store');
        // stream del binario al response
        // @ts-ignore - tipos de Node stream vs web stream
        fileRes.body.pipe(res);
      } catch {
        res.status(404).send('Not Found');
      }
      return;
    }

    if (req.method === 'PUT') {
      const ab = await bufferFromReq(req);
      const blob = new Blob([ab], { type: EXCEL_MIME });

      await put(EXCEL_PATH, blob, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: EXCEL_MIME,
      });

      res.status(204).end();
      return;
    }

    res.setHeader('Allow', 'GET, PUT');
    res.status(405).end('Method Not Allowed');
  } catch (e: any) {
    console.error(e);
    res.status(500).send('Internal Error');
  }
}

function bufferFromReq(req: VercelRequest): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (d) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      resolve(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    });
    req.on('error', reject);
  });
}