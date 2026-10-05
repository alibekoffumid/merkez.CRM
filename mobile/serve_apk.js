const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8088;
const apkPath = path.resolve(__dirname, '../merkez-mobile.apk');

const server = http.createServer((req, res) => {
  if (req.url === '/merkez-mobile.apk' || req.url === '/download') {
    if (!fs.existsSync(apkPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('APK tapılmadı');
      return;
    }
    const stat = fs.statSync(apkPath);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename="merkez-mobile.apk"',
    });
    fs.createReadStream(apkPath).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Merkez Mobile APK</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 40px 20px; background: #F9FAFB; color: #111827; }
          .card { background: white; max-width: 420px; margin: 0 auto; padding: 30px; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); }
          h2 { margin-top: 0; color: #111827; font-size: 22px; }
          p { color: #6B7280; font-size: 14px; margin-bottom: 25px; }
          .btn { display: inline-block; width: 100%; box-sizing: border-box; padding: 16px; background: #10B981; color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; }
          .btn:active { background: #059669; }
          .size { margin-top: 12px; font-size: 12px; color: #9CA3AF; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>📦 Merkez Склад & Сканер</h2>
          <p>Android üçün rəsmi quraşdırma faylı (Release APK)</p>
          <a class="btn" href="/merkez-mobile.apk">Yüklə (APK Endir)</a>
          <div class="size">Fayl ölçüsü: ~98.4 MB · Versiya: 1.0.0</div>
        </div>
      </body>
      </html>
    `);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`APK download server running at http://0.0.0.0:${PORT}/`);
});
