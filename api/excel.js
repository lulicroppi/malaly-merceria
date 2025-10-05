// api/excel.js
const EXCEL_PATH = 'merceria.xlsx';
const EXCEL_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

module.exports = async (req, res) => {
  try {
    // Chequeo claro de configuración
    if (!process.env['BLOB_READ_WRITE_TOKEN']) {
      res
        .status(500)
        .send(
          'Blob no configurado: falta la env var BLOB_READ_WRITE_TOKEN (Project → Storage → Blob → Create store → Connect to Project).'
        );
      return;
    }

    // Import dinámico (ESM) dentro de CJS
    const { put, head } = await import('@vercel/blob');

    if (req.method === 'GET') {
      try {
        const meta = await head(EXCEL_PATH); // lanza si no existe
        const url = meta.downloadUrl ?? meta.url;
        const fileRes = await fetch(url);
        if (!fileRes.ok) {
          res.status(502).send('Blob fetch failed');
          return;
        }
        const ab = await fileRes.arrayBuffer();
        res.setHeader('Content-Type', EXCEL_MIME);
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).send(Buffer.from(ab));
        return;
      } catch {
        res.status(404).send('Not Found');
        return;
      }
    }

    if (req.method === 'PUT') {
      const chunks = [];
      req.on('data', (d) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
      req.on('end', async () => {
        const buf = Buffer.concat(chunks);
        const blob = new Blob([buf], { type: EXCEL_MIME });
        // Nota: muchos proyectos usan 'public'; si tu store exige privado, luego ajustamos.
        await put(EXCEL_PATH, blob, {
          access: 'public',
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: EXCEL_MIME,
        });
        res.status(204).end();
      });
      return;
    }

    res.setHeader('Allow', 'GET, PUT');
    res.status(405).end('Method Not Allowed');
  } catch (e) {
    console.error('api/excel error:', e);
    res
      .status(500)
      .send('Function error en /api/excel (revisá los logs del deployment para el detalle).');
  }
};