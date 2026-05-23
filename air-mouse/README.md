# 🖐️ Air Mouse — Управление CRM жестами

Управляй веб-интерфейсом CRM «по воздуху» — перемещай курсор рукой через камеру телефона, а кликай сжатием пальцев (pinch).

## Архитектура

```
┌─────────────────┐      WebSocket      ┌──────────────────┐
│  📱 Телефон     │ ──── ws://... ────▶ │  🖥️ Node.js      │
│  (controller)   │  MOVE / PINCH      │  Relay Server    │
│  MediaPipe Hands│                     │  (server.js)     │
└─────────────────┘                     └────────┬─────────┘
                                                 │ broadcast
                                        ┌────────▼─────────┐
                                        │  🌐 Браузер CRM  │
                                        │  AirMouseReceiver │
                                        │  (React component)│
                                        └──────────────────┘
```

## Быстрый старт

### 1. Запуск сервера

```bash
cd air-mouse
npm install
node server.js
```

Сервер запустится на `ws://localhost:8765`.

### 2. Подключение CRM-клиента

В любом месте вашего React-приложения добавьте компонент:

```jsx
import AirMouseReceiver from './components/AirMouse/AirMouseReceiver';

function App() {
  return (
    <>
      <YourApp />
      <AirMouseReceiver serverUrl="ws://localhost:8765" />
    </>
  );
}
```

### 3. Открытие контроллера на телефоне

**Важно:** Телефон и компьютер должны быть в одной WiFi-сети.

1. Узнайте IP вашего компьютера (`ipconfig` в терминале)
2. Откройте `controller.html` на телефоне — можно:
   - Захостить через `npx serve air-mouse` и открыть `http://<IP>:3000/controller.html`
   - Или просто открыть файл через любой локальный сервер
3. В поле ввода URL укажите `ws://<IP-компьютера>:8765`
4. Нажмите **Подключиться**
5. Покажите руку в камеру 🖐️

## Жесты

| Жест | Действие |
|------|----------|
| ✋ Открытая ладонь | Перемещение курсора |
| 🤏 Сжатие большого + указательного | Клик (mousedown → click → mouseup) |

## Настройка

### Пороги (в controller.html)

```js
const CONFIG = {
  PINCH_THRESHOLD: 0.06,         // Расстояние для срабатывания pinch
  PINCH_RELEASE_THRESHOLD: 0.09, // Расстояние для отпускания (гистерезис)
  SMOOTHING: 0.65,               // Сглаживание (0-1, выше = плавнее)
  SEND_INTERVAL_MS: 16,          // Частота отправки (~60fps)
};
```

### React компонент (props)

| Prop | Тип | По умолчанию | Описание |
|------|-----|-------------|----------|
| `serverUrl` | string | `ws://localhost:8765` | URL WebSocket сервера |
| `showStatusBadge` | boolean | `true` | Показывать бейдж статуса |
| `enabled` | boolean | `true` | Включить/выключить Air Mouse |

### Хук useAirMouse

```js
import { useAirMouse } from './components/AirMouse/useAirMouse';

const { x, y, screenX, screenY, isPinching, isConnected, connect, disconnect } = useAirMouse('ws://localhost:8765');
```

## Файлы

```
air-mouse/
├── server.js          # WebSocket relay сервер
├── controller.html    # Мобильный контроллер (MediaPipe Hands)
├── package.json       # Зависимости сервера
└── README.md          # Эта документация

src/components/AirMouse/
├── useAirMouse.js         # React-хук
└── AirMouseReceiver.jsx   # Компонент с курсором
```
