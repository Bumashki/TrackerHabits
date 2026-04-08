# TrackerHabits

Веб-приложение для отслеживания привычек и мотивации через друзей.

**Стек:** React (Vite) + FastAPI + SQLAlchemy. Фронт ходит в API по пути `/api`; в режиме разработки Vite проксирует запросы на локальный бэкенд.

---

## Что нужно установить

| Инструмент | Зачем |
|------------|--------|
| **Python 3.11+** | Бэкенд |
| **Node.js 18+** (LTS) | Фронтенд, сборка |

Проверка в терминале:

```bash
python --version
node --version
```

На Windows, если команды `python` нет, попробуйте `py -3 --version`.

---

## Структура репозитория

```
GROUP_SITE/
├── backend/          # FastAPI, модели, БД
│   ├── app/
│   ├── requirements.txt
│   └── .env          # создаёте сами (не в git)
└── frontend/         # React + Vite
    ├── src/
    └── package.json
```

---

## Локальный запуск (два терминала)

Нужны **два процесса одновременно**: API и фронт. Сначала бэкенд, потом фронт (или наоборот — главное, чтобы к моменту открытия сайта API уже слушал порт).

### 1. Бэкенд (FastAPI)

**Windows (PowerShell):**

```powershell
cd путь\к\GROUP_SITE\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Если активация ругается на политику выполнения скриптов:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Либо без активации venv:

```powershell
.\.venv\Scripts\pip.exe install -r requirements.txt
.\.venv\Scripts\uvicorn.exe app.main:app --reload --host 127.0.0.1 --port 8001
```

**Linux / macOS:**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

**Проверка:** в браузере откройте:

- `http://127.0.0.1:8001/health` — должно быть `{"ok":true}`
- `http://127.0.0.1:8001/docs` — интерактивная документация API

**База данных по умолчанию** — SQLite, файл `backend/data/app.db` (каталог создаётся при первом запуске).

Чтобы использовать **PostgreSQL**, в папке `backend` создайте файл **`.env`**:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
```

Без `.env` используется строка из `app/config.py` (SQLite).

---

### 2. Фронтенд (Vite + React)

Новый терминал:

```bash
cd путь/к/GROUP_SITE/frontend
npm install
npm run dev
```

Откройте в браузере адрес из консоли — обычно **`http://localhost:5173`**.

Запросы с фронта идут на **`/api`**; Vite проксирует их на **`http://127.0.0.1:8001`** (см. `frontend/vite.config.js`). Отдельно прописывать URL бэкенда в коде не нужно.

---

## Куда заходить в браузере

| URL | Что это |
|-----|---------|
| **http://localhost:5173** | Приложение (интерфейс) — **основной адрес для работы** |
| http://127.0.0.1:8001/docs | Swagger, ручные запросы к API |
| http://127.0.0.1:8001/health | Проверка, что API запущен |

Не путайте: **интерфейс** — на порту **5173**, **API** — на **8001**. Открытие только `8001` покажет JSON/Swagger, не React-страницу.

---

## Порт 8000 на Windows

Если команда с `--port 8000` падает с ошибкой вроде **WinError 10013** («доступ к сокету запрещён»), используйте **8001** (как в примерах выше) или другой свободный порт. Тогда в **`frontend/vite.config.js`** в `proxy` для `/api` укажите тот же порт в `target`.

---

## Сборка фронта для продакшена

```bash
cd frontend
npm run build
```

Результат в папке **`frontend/dist/`** — статика для nginx или любого веб-сервера. API в проде обычно проксируется с того же домена на префикс `/api`.

---

## Краткий чеклист

1. [ ] Виртуальное окружение Python, `pip install -r backend/requirements.txt`
2. [ ] `uvicorn` запущен на **8001**, `/health` отвечает
3. [ ] `npm install` и `npm run dev` в `frontend/`
4. [ ] Браузер: **http://localhost:5173**

После этого приложение должно подгружать данные с бэкенда через `/api`.
