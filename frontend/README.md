# Hutka — фронтенд

Костяк SPA для платформы Hutka (P2P-аренда авто). Один проект, три кабинета: арендатор и гость, партнёр, админ.
Сборка (`npm run build`), тесты (`npm test`) и линтер (`npm run lint`) в песочнице проходят. Запуск против вашего бэка я не проверял: бэк у меня не запускался.

## 1. Быстрый старт

Проверял на Node 22.22.2 и npm 10.9.7. Другие версии не пробовал.

```bash
npm install
# готовый .env.development уже лежит в проекте, при необходимости поправьте порт бэка
npm run dev                        # http://localhost:5173
```

### Настройка бэка (обязательно)
Бэк пускает только один origin (`app.frontend-base-url`) и для CORS, и для WebSocket (`config/SecurityConfig.java`, `config/WebSocketConfig.java`). Поставьте в конфиге бэка:

```
app.frontend-base-url=http://localhost:5173
```

`app.admin-base-url` можно не задавать: тогда админка использует тот же origin (`config/AdminSecurityConfig.java`).

### Порт бэка
В `.env.development` стоит `VITE_PROXY_TARGET=http://localhost:8080`. Это **предположение**: `application.yml` в присланном архиве не было. Поставьте реальный порт.

### Как фронт ходит на бэк в dev
Все запросы идут на `/api/*`. Прокси Vite отрезает `/api` и шлёт на бэк. Префикс нужен, потому что пути страниц SPA (`/cars`, `/login`) совпадают с путями API (`/cars`). Прокси также проксирует WebSocket (`/api/ws`). Ожидается, что заголовок Origin останется `http://localhost:5173` (в конфиге включён только `changeOrigin`, который меняет Host), и именно его сверяет бэк. Это я не проверял на живом бэке: если WebSocket отвечает отказом по origin, смотрите сюда.

В production задайте `VITE_API_URL` (абсолютный адрес бэка) и поставьте тот же адрес фронта в `app.frontend-base-url`.

## 2. Что установлено и зачем

Версии взяты из `package.json`, который сгенерировал npm при установке.

| Пакет | Версия | Зачем |
|---|---|---|
| react, react-dom | ^19.2.8 | UI |
| react-router | ^8.4.0 | Маршруты, guards, ленивая загрузка страниц. Импорт `RouterProvider` идёт из `react-router/dom` |
| @tanstack/react-query | ^5.104.3 | Кэш и состояние запросов: дашборды собираются из нескольких запросов, списки с пагинацией |
| zustand | ^5.0.15 | Маленькие сторы: токен, админ-сессия |
| react-hook-form, zod, @hookform/resolvers | ^7.90.0, ^4.6.7, ^5.9.1 | Формы и валидация по правилам из документа (пароль 8–72, год ≥ 2014…) |
| @stomp/stompjs | ^7.5.0 | WebSocket (STOMP): уведомления и чат групповых поездок |
| leaflet, react-leaflet, @types/leaflet | ^1.9.4, ^5.0.0, ^1.9.22 | Карта каталога. Установлены, в коде пока не подключены |
| chart.js, react-chartjs-2 | ^4.5.1, ^5.3.1 | Графики аналитики партнёра и админа. Установлены, в коде пока не подключены |
| lucide-react, @fontsource-variable/inter | ^1.59.0, ^5.3.0 | Иконки (глаз, почта, закрыть…) и шрифт Inter, раздаётся с вашего сервера, без запросов к Google Fonts |
| tailwindcss, @tailwindcss/vite | ^4.3.3, ^4.3.3 | Стили. Подключение: плагин в `vite.config.ts` и `@import "tailwindcss"` в `src/styles/index.css` |
| openapi-typescript | ^7.13.0 | Генерация типов из OpenAPI-схемы бэка (`npm run gen:api`) |
| vitest | ^5.0.5 | Тесты |
| vite, @vitejs/plugin-react, typescript, oxlint | ^8.3.0, ^6.1.1, ^5.9.3, ^1.81.0 | Сборка, компиляция, линтер (поставляются шаблоном Vite) |

### Почему TypeScript 5, а не 6
Шаблон Vite поставил TypeScript 6. `openapi-typescript` ^7.13.0 заявляет peer-зависимость `typescript@^5.x`, и `npm install` падал с ошибкой ERESOLVE. Я поставил TypeScript 5. Когда выйдет `openapi-typescript` с поддержкой 6, можно обновить.

### Что я не ставил намеренно
- **openapi-fetch**: ставил и убрал. HTTP-слой написан вручную (`src/api/core.ts`), а `openapi-typescript` используется только для типов.
- **axios, redux, moment, UI-киты (MUI, Ant)**: не нужны для текущих задач.
- **Radix UI / shadcn**: добавите, когда понадобятся модалки и выпадающие списки.

## 3. Скрипты

| Команда | Что делает |
|---|---|
| `npm run dev` | dev-сервер на 5173 с прокси `/api` |
| `npm run build` | проверка типов (`tsc -b`) и сборка |
| `npm test` | Vitest |
| `npm run lint` | oxlint |
| `npm run gen:api` | типы из OpenAPI в `src/api/generated/schema.d.ts`. Бэк должен быть запущен. URL схемы по умолчанию `http://localhost:8080/v3/api-docs`. Это путь по умолчанию у springdoc, я его не проверял: возьмите реальную ссылку на JSON из Swagger UI и задайте `OPENAPI_URL=...` |

## 4. Архитектура

```
src/
├─ main.tsx                    # точка входа
├─ styles/index.css            # @import "tailwindcss" + дизайн-токены (@theme)
├─ app/
│  ├─ App.tsx                  # Providers + RouterProvider
│  ├─ providers.tsx            # QueryClient (без ретраев на 4xx)
│  ├─ SocketBridge.tsx         # WebSocket живёт, пока есть токен
│  └─ router/
│     ├─ index.tsx             # дерево: публичные / /app / /partner / /admin
│     ├─ guards.tsx            # RequireAuth, RequireVerified, RequirePartner, RequireAdmin
│     └─ routes.*.ts           # ленивые маршруты по кабинетам
├─ api/
│  ├─ core.ts                  # фабрика клиента: JSON, Blob, X-Total-Count, 401
│  ├─ http.ts                  # клиент пользователя: Bearer-токен
│  ├─ adminHttp.ts             # клиент админа: cookie + X-CSRF-TOKEN
│  ├─ ws.ts                    # STOMP: токен в CONNECT-заголовке Authorization
│  ├─ errors.ts                # ApiError по формату {status,message,fields}
│  └─ generated/schema.d.ts    # заменяется npm run gen:api
├─ shared/
│  ├─ config/env.ts            # API_BASE, wsUrl()
│  ├─ layouts/                 # Public, Auth (вход/регистрация), Renter, Partner, Admin
│  ├─ ui/                      # Button, fields (TextField, PasswordField, Checkbox), toast, ToastHost, Placeholder, Loading
│  └─ lib/                     # format.ts (деньги, даты), download.ts (Blob → файл)
└─ features/                   # по доменам; каждая фича: pages/, позже components/, api.ts, hooks.ts
   ├─ auth/        A2–A6   (реализованы A2 регистрация, A3 код из письма, A4 вход; A5, A6 пока заглушки)
   ├─ dashboard/   B1
   ├─ profile/     B2, B3
   ├─ cars/        A1, B4, B5
   ├─ favorites/   B6
   ├─ bookings/    B7–B13
   ├─ pdd/         B14, B15
   ├─ group-trips/ B16–B18
   ├─ support/     B19–B21 (используется и в кабинете партнёра)
   ├─ notifications/ B23
   ├─ partner/     B24, P1–P11
   └─ admin/       AD1–AD20
```

### Правила
1. Фича импортирует только из `shared/` и `api/`, не из другой фичи.
2. Каждая страница пока `Placeholder` со списком эндпоинтов из документа. Заменяйте содержимое страницы по одной. За образец берите `features/auth/pages/RegisterPage.tsx` (форма на общих полях, ошибки сервера по полям и toast): форма → вызов `*/api.ts` → стор → переход.
3. Запросы к бэку только через `http` (пользователь) или `adminHttp` (админ). Никакого `fetch` в компонентах.
4. Файлы скачиваются через `http.blob(...)` и `saveBlob(...)`: договор PDF (B12, P6) и CSV (AD15). Обычной ссылкой нельзя, нужен заголовок Bearer.
5. В `tsconfig` включён `erasableSyntaxOnly`: без `enum` и параметров-свойств в конструкторах. Используйте объединения строк (`'pending' | 'active'`).

### Авторизация
- **Пользователь.** JWT в `localStorage` (`src/features/auth/store.ts`). Минус: токен доступен любому XSS-скрипту. Клиентского logout-эндпоинта у бэка нет, выход = удалить токен.
- **Админ.** cookie `JSESSIONID`, запросы с `credentials: 'include'`, на POST/PATCH/PUT/DELETE уходит `X-CSRF-TOKEN`. Токен приходит из `POST /admin/auth/login` и `GET /admin/auth/me`, хранится только в памяти.
- **Гейты.** `RequireVerified` ведёт на `/app/license`, если статус ВУ не `verified` (иначе бэк отвечал бы 403).

### Маршруты
| Область | Префикс | Примеры |
|---|---|---|
| Гость и вход | `/` | `/cars`, `/cars/:carId`, `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password` |
| Арендатор | `/app` | `/app`, `/app/bookings`, `/app/pdd`, `/app/group-trips/:tripId`, `/app/license` |
| Партнёр | `/partner` | `/partner`, `/partner/cars/new`, `/partner/payouts/:payoutId` |
| Админ | `/admin` | `/admin/login`, `/admin/users/:userId`, `/admin/finance/payouts` |

Экраны B10–B13 (старт, финиш, договор, оценка) живут внутри `BookingDetailPage`, B22 (AI-виджет) будет глобальным компонентом в layout'ах, AD15 (экспорт) это кнопка на экранах финансов.

## 4a. Цвета (дизайн-токены)

Направление: **«песок и графит»**. Фон страницы тёплый, не белый; основной цвет нейтральный графитовый; цветность несут только статусы. Токены лежат в `src/styles/index.css` (блок `@theme`, Tailwind v4) и дают классы вроде `bg-surface`, `text-muted`, `border-line`, `bg-primary`.

| Токен | Значение | Назначение |
|---|---|---|
| `bg` | #F0EADF | фон страницы (задан на `body`) |
| `surface` | #FAF7F1 | карточки, шапки, поля ввода |
| `surface-2` | #E6DECF | вложенные блоки, заглушки фото |
| `line` | #DDD5C6 | границы |
| `fg` / `muted` | #18181B / #5C5750 | основной и вторичный текст |
| `primary` / `primary-hover` / `primary-fg` | #18181B / #27272A / #FAFAFA | кнопки, фокус |
| `danger` | #B91C1C | текст ошибок |

Цвета статусов взяты из `Hutka.md`, разд. 22.1 и 22.2: бронь `pending`/`active` #3B82F6, `finished`/`cancelled` #71717A; машина `available` #22C55E, `reserved` #F97316, `in_trip` #3B82F6, `under_review` #EF4444. Для маркеров карты те же значения продублированы в `src/shared/config/statusColors.ts`: при изменении правьте оба места.

**Контраст** (посчитан по формуле WCAG, порог AA для обычного текста 4.5:1): графит на песке 14.80:1, `muted` на песке 5.98:1, на карточке 6.69:1, на `surface-2` 5.36:1; `danger` на песке 5.40:1, на карточке 6.05:1; `primary-fg` на графите 16.97:1. Прежний красный #DC2626 на песке давал 4.03:1 и был заменён на #B91C1C.

Статусные цвета не проходят как цвет текста на светлых фонах (на белом: зелёный 2.28:1, оранжевый 2.80:1, синий 3.68:1, красный 3.76:1; на песке я их не считал). Поэтому `StatusBadge` рисует цвет точкой, а текст оставляет графитовым.

Не решено: тёмная тема (в `Hutka.md` требований не нашёл), шрифт, логотип, отдельный акцентный цвет (сейчас его нет).

## 5. Порядок реализации (рекомендация)
1. Проверить связку: запустить бэк, открыть `/login`, войти существующим пользователем, убедиться, что `GET /users/me` проходит и виден переход в `/app`.
2. A2 → A3 (регистрация и код) и A5/A6 (сброс пароля).
3. A1/B4/B5 (каталог, карта, карточка): подключить Leaflet и читать `X-Total-Count` через `http.requestWithTotal`.
4. B3 (ВУ) → B7–B13 (бронь).
5. Остальной кабинет арендатора, затем партнёр, затем админка.
6. `npm run gen:api` и замена рукописных типов на сгенерированные.

## 6. Что не проверено и не сделано
- Запуск против реального бэка, порт 8080 и путь `/v3/api-docs`: предположения.
- Валюта в `formatMoney` по умолчанию `BYN`. Это моё допущение (в документе упомянут часовой пояс Минска), бэк отдаёт `currency` в части ответов, берите её оттуда.
- Формат тела сообщения по WebSocket для уведомлений в коде бэка я не проверял, поэтому `SocketBridge` разбирает его защитно.
- Карты и графики не подключены (пакеты только установлены). Для Leaflet понадобится `import 'leaflet/dist/leaflet.css'` и настройка иконок маркеров.
- Если WebSocket отклонит CONNECT (протухший токен), клиент будет пробовать переподключиться каждые 5 секунд, пока токен не сбросится через любой запрос с 401.
- Тестов один (форматирование), покрытия нет.
