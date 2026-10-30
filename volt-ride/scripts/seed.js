require("dotenv").config({ path: ".env.local" });
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

async function main() {
  if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
    throw new Error("Заполните DB_USER и DB_PASSWORD в .env.local");
  }
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "volt_ride",
    charset: "utf8mb4"
  });

  const adminEmail = (process.env.ADMIN_EMAIL || "admin@voltride.local").toLowerCase();
  const adminName = process.env.ADMIN_NAME || "VOLT Administrator";
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  if (adminPassword.length < 12) throw new Error("ADMIN_PASSWORD должен быть не короче 12 символов.");

  const [existing] = await db.execute("SELECT id FROM users WHERE email=? LIMIT 1", [adminEmail]);
  if (!existing.length) {
    const hash = await bcrypt.hash(adminPassword, 12);
    await db.execute("INSERT INTO users (name,email,password_hash,role,accepted_rules_at) VALUES (?,?,?,'admin',NOW())", [adminName, adminEmail, hash]);
    console.log(`Создан администратор: ${adminEmail}`);
  } else {
    console.log(`Администратор ${adminEmail} уже существует; пароль не изменён.`);
  }

  const [scooters] = await db.execute("SELECT COUNT(*) AS total FROM scooters");
  if (Number(scooters[0].total) === 0) {
    const demo = [
      ["Volt Mini","child",96,15,18,500,55.7519,37.6178],
      ["Volt City","adult",82,25,32,800,55.7558,37.6201],
      ["Volt Pro X","professional",74,40,45,1200,55.7485,37.6235],
      ["Volt City 02","adult",61,25,24,800,55.7542,37.6120],
      ["Volt City 03","adult",88,25,30,800,55.7468,37.6098],
      ["Volt Pro S","professional",69,35,38,1100,55.7590,37.6280]
    ];
    for (const s of demo) {
      await db.execute("INSERT INTO scooters (name,type,battery,max_speed,range_km,price_per_minute_cents,latitude,longitude) VALUES (?,?,?,?,?,?,?,?)", s);
    }
    console.log(`Добавлено стартовых самокатов: ${demo.length}`);
  } else {
    console.log("Самокаты уже есть; новые записи не добавлялись.");
  }
  await db.end();
  console.log("Готово.");
}

main().catch((e) => { console.error(e); process.exit(1); });
