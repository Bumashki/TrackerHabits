# TrackerHabits

Веб-приложение для отслеживания привычек и мотивации через друзей.

**Стек:** React (Vite) + FastAPI + SQLAlchemy. Фронт ходит в API по пути `/api`; в режиме разработки Vite проксирует запросы на локальный бэкенд.

---

## Локальные тесты на Windows

Ниже — полная последовательность для **PowerShell** (рекомендуется) или **cmd**. Нужны **два окна терминала**: одно для API, второе для фронта.

### 1. Что установить

| Программа | Зачем | Где взять |
|-----------|--------|-----------|
| **Python 3.11+** | бэкенд | [python.org](https://www.python.org/downloads/) — при установке отметьте **Add python.exe to PATH** |
| **Node.js 18+ LTS** | фронтенд | [nodejs.org](https://nodejs.org/) |

Проверка в **новом** терминале:

```powershell
python --version
node --version
npm --version
```

Если `python` не находится, попробуйте:

```powershell
py -3 --version
```

Дальше вместо `python` используйте `py -3` (создание venv: `py -3 -m venv .venv`).

---

### 2. Перейти в каталог проекта

Подставьте свой путь к клону репозитория, например:

```powershell
cd D:\CODE_TEACH\SHADRINA\GROUP_SITE
```

---

### 3. Бэкенд (первый терминал)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

**Если активация `.venv` падает** с текстом про политику выполнения скриптов:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Затем снова:

```powershell
.\.venv\Scripts\Activate.ps1
```

**Без активации venv** (если не хотите менять политику):

```powershell
cd backend
.\.venv\Scripts\pip.exe install -r requirements.txt
.\.venv\Scripts\uvicorn.exe app.main:app --reload --host 127.0.0.1 --port 8001
```

(папку `.venv` сначала нужно создать командой `python -m venv .venv`.)

Оставьте это окно открытым. В логе должно быть что-то вроде `Uvicorn running on http://127.0.0.1:8001`.

**Проверка в браузере:**

- `http://127.0.0.1:8001/health` → `{"ok":true}`
- `http://127.0.0.1:8001/docs` → Swagger

**База по умолчанию** — SQLite, файл `backend\data\app.db` (каталог создаётся сам). При старте приложение само удаляет этот файл, если в нём **старая схема** с целочисленным `users.id` (до перехода на UUID); затем создаёт таблицы заново. При других проблемах со схемой можно по-прежнему удалить `backend\data\app.db` вручную и перезапустить uvicorn.

**Опционально — PostgreSQL:** скопируйте `backend\.env.example` в `backend\.env` и пропишите `DATABASE_URL` и при необходимости `DEFAULT_USER_ID` (UUID).

---

### 4. Фронтенд (второй терминал)

```powershell
cd D:\CODE_TEACH\SHADRINA\GROUP_SITE\frontend
npm install
npm run dev
```

Откройте в браузере адрес из консоли Vite — обычно **`http://localhost:5173`**.

Запросы идут на **`/api`**; Vite проксирует их на **`http://127.0.0.1:8001`** (`frontend\vite.config.js`). Менять URL бэкенда в коде не нужно.

---

### 5. Куда смотреть в браузере

| URL | Назначение |
|-----|------------|
| **http://localhost:5173** | Основной интерфейс приложения |
| http://127.0.0.1:8001/docs | Документация API (Swagger) |
| http://127.0.0.1:8001/health | Проверка, что API жив |

Интерфейс — на **5173**, API — на **8001**. Открывать только порт 8001 можно для проверки JSON/Swagger, но не вместо React-приложения.

---

### 6. Частые проблемы на Windows

| Проблема | Что сделать |
|----------|-------------|
| **WinError 10013** на порту **8000** | Используйте порт **8001** (как в командах выше). Если смените порт бэкенда — в `frontend\vite.config.js` в `proxy` для `/api` укажите тот же порт в `target`. |
| **`python` не является командой** | Установите Python с PATH или используйте `py -3`. |
| **Не находится модуль `app`** | Команды uvicorn запускайте из каталога **`backend`**, а не из корня репозитория. |
| **Старый SQLite с integer id** | Удалите `backend\data\app.db` и перезапустите бэкенд (схема с UUID). |

---

### 7. Чеклист локального запуска (Windows)

1. [ ] Установлены Python 3.11+ и Node.js 18+.
2. [ ] В каталоге `backend` создан venv, выполнен `pip install -r requirements.txt`.
3. [ ] Запущен uvicorn на **127.0.0.1:8001**, `/health` отвечает.
4. [ ] В каталоге `frontend` выполнены `npm install` и `npm run dev`.
5. [ ] В браузере открыт **http://localhost:5173**.

---

## Структура репозитория

```
GROUP_SITE/
├── backend/          # FastAPI, модели, БД
│   ├── app/
│   ├── requirements.txt
│   ├── .env.example
│   └── .env          # создаёте сами (не в git)
└── frontend/         # React + Vite
    ├── src/
    └── package.json
```

---

## Linux / macOS (кратко)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Во втором терминале: `cd frontend && npm install && npm run dev`.

Пример `.env` для PostgreSQL:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DEFAULT_USER_ID=00000000-0000-0000-0000-000000000001
```

`DEFAULT_USER_ID` — UUID пользователя по умолчанию (без заголовка `X-User-Id`).

---

## Сборка фронта для продакшена

```bash
cd frontend
npm run build
```

Результат в **`frontend/dist/`** — статика для nginx; API в проде обычно на том же домене по префиксу `/api`.
