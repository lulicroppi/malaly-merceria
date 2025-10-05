// api/ping.js
module.exports = (_req, res) => {
  res.status(200).json({
    ok: true,
    hasBlobToken: Boolean(process.env['BLOB_READ_WRITE_TOKEN']),
    hint: !process.env['BLOB_READ_WRITE_TOKEN']
      ? 'Conectá un Blob store en Vercel → Project → Storage → Blob → Create store → Connect to Project.'
      : 'Todo ok con la env var.'
  });
};