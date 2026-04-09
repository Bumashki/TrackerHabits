# Деплой на Linux: бэкенд + фронт (dev с hot reload)

## Идея

- **Бэкенд:** `uvicorn ... --reload` — при изменении `.py` в `backend/app/` процесс перезапускается.
- **Фронт:** `npm run dev` (Vite) — HMR в браузере при изменении `frontend/src/`.
- После **`git pull`** файлы на диске обновляются; обычно reload/HMR срабатывают сами. Дополнительно можно поставить **git hook** `post-merge`, который делает `systemctl restart` (если нужен жёсткий перезапуск, например после смены зависимостей).

Пути ниже — пример для `/var/www/TrackerHabits`; поправь пользователя и каталоги.

## Установка systemd

```bash
sudo cp deploy/systemd/tracker-habits-backend.service /etc/systemd/system/
sudo cp deploy/systemd/tracker-habits-frontend.service /etc/systemd/system/
sudo sed -i 's|/var/www/TrackerHabits|/ВАШ/ПУТЬ|g' /etc/systemd/system/tracker-habits-*.service
sudo sed -i 's|maksimka|ВАШ_ПОЛЬЗОВАТЕЛЬ|g' /etc/systemd/system/tracker-habits-*.service
sudo systemctl daemon-reload
sudo systemctl enable --now tracker-habits-backend tracker-habits-frontend
sudo systemctl status tracker-habits-backend tracker-habits-frontend
```

Проверь, что в `frontend` выполнено `npm ci` хотя бы раз.

## Адреса

- Сайт (Vite): `http://СЕРВЕР:5173`
- API (проксируется Vite на `/api`): бэкенд слушает `8000` (см. unit).

## Git hook после pull

```bash
chmod +x scripts/install-git-hooks.sh
./scripts/install-git-hooks.sh
```

Хук вызывает `sudo systemctl restart ...`. Чтобы не вводить пароль, настрой `sudoers` для `systemctl restart` только этих unit (см. вывод скрипта).

## Остановка

```bash
sudo systemctl stop tracker-habits-frontend tracker-habits-backend
sudo systemctl disable tracker-habits-frontend tracker-habits-backend
```

## Прод без Vite (только один процесс на 8000)

Собери фронт (`npm run build`), отключи `tracker-habits-frontend`, оставь только бэкенд — в `main.py` раздаётся `frontend/dist` с того же порта.
