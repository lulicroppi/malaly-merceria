// api/excel.ts
const EXCEL_PATH = 'merceria.xlsx';
const EXCEL_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export default async function handler(req: any, res: any) {
  try {
    // Check de configuración del Blob
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res
        .status(500)
        .send('Blob no configurado: falta la env var BLOB_READ_WRITE_TOKEN (conectá un Blob store al proyecto y redeploy).');
    }

    const { put, head } = await import('@vercel/blob');

    if (req.method === 'GET') {
      try {
        const meta = await head(EXCEL_PATH); // lanza si no existe
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
  } catch (e: any) {
    console.error('api/excel error:', e);
    return res.status(500).send('Function error en /api/excel (ver logs del deployment para más detalle).');
  }
}