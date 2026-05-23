/**
 * ============================================================
 *  AIR MOUSE — WebSocket Relay Server
 * ============================================================
 *
 *  Принимает данные жестов от мобильного контроллера и
 *  транслирует (broadcast) их всем подключённым CRM-клиентам.
 *
 *  Запуск:
 *    npm install ws
 *    node server.js
 *
 *  Порт по умолчанию: 8765
 * ============================================================
 */

const { WebSocketServer } = require('ws');

// ── Конфигурация ────────────────────────────────────────────
const PORT = process.env.AIR_MOUSE_PORT || 8765;

// ── Создаём WebSocket сервер ────────────────────────────────
const wss = new WebSocketServer({ port: PORT });

// Счётчик подключений для логов
let connectionId = 0;

console.log(`\n🖐️  Air Mouse Server запущен на ws://localhost:${PORT}`);
console.log(`   Ожидаю подключения контроллера и CRM-клиентов...\n`);

wss.on('connection', (ws, req) => {
  const id = ++connectionId;
  const ip = req.socket.remoteAddress;

  console.log(`✅ [#${id}] Новое подключение от ${ip}  (всего: ${wss.clients.size})`);

  // ── Обработка входящих сообщений ──────────────────────────
  ws.on('message', (raw) => {
    let data;

    // Парсим JSON, игнорируем мусор
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.warn(`⚠️  [#${id}] Невалидный JSON:`, raw.toString().slice(0, 100));
      return;
    }

    // Логируем только значимые события (не каждый MOVE, чтобы не спамить)
    if (data.type !== 'MOVE') {
      console.log(`📡 [#${id}] ${data.type}`, data.x !== undefined ? `(${data.x.toFixed(3)}, ${data.y.toFixed(3)})` : '');
    }

    // ── Broadcast всем КРОМЕ отправителя ────────────────────
    const message = JSON.stringify(data);

    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === 1 /* OPEN */) {
        client.send(message);
      }
    });
  });

  // ── Обработка отключения ──────────────────────────────────
  ws.on('close', (code, reason) => {
    console.log(`❌ [#${id}] Отключился (code: ${code})  (осталось: ${wss.clients.size})`);
  });

  ws.on('error', (err) => {
    console.error(`🔴 [#${id}] Ошибка:`, err.message);
  });

  // Отправляем приветствие
  ws.send(JSON.stringify({
    type: 'WELCOME',
    message: `Подключено к Air Mouse Server (client #${id})`,
    timestamp: Date.now()
  }));
});

// ── Graceful shutdown ───────────────────────────────────────
process.on('SIGINT', () => {
  console.log('\n🛑 Остановка сервера...');
  wss.clients.forEach((client) => {
    client.close(1001, 'Server shutting down');
  });
  wss.close(() => {
    console.log('   Сервер остановлен.');
    process.exit(0);
  });
});
