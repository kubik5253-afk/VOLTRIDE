1. открыть консоль по пути C:\Users\Пользователь
2. ввести: git clone https://github.com/kubik5253-afk/VOLTRIDE.git
3. создать базу данных из файла: C:\Users\Пользователь\Desktop\VOLTRIDE\volt-ride\database\volt_ride_schema.sql
4. Настройка переменных окружения

Для подключения к базе данных и работы авторизации необходимо создать файл .env.local.
Он должен находиться в корневой папке проекта, рядом с package.json.
Важно: название файла должно быть именно .env.local, а не env.local или .env.local.txt.
Создайте файл и добавьте следующие переменные:

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=ВАШ_ПАРОЛЬ_MYSQL
DB_NAME=volt_ride

SESSION_SECRET=ВАШ_СЕКРЕТ_ДЛЯ_СЕССИЙ_МИНИМУМ_32_СИМВОЛА
CRON_SECRET=ВАШ_СЕКРЕТ_ДЛЯ_CRON

ADMIN_NAME=Администратор
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=НАДЕЖНЫЙ_ПАРОЛЬ_ОТ_12_СИМВОЛОВ

Замените примеры на реальные значения.
5. открыть консоль по пути C:\Users\Пользователь\Desktop\VOLTRIDE\volt-ride
6. ввести :
7. npm install
8. npm run seed
9. npm run dev
10 Откройте браузер и перейдите по адресу: http://localhost:3000
