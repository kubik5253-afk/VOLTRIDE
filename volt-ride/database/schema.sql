CREATE DATABASE IF NOT EXISTS volt_ride
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE volt_ride;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  balance_cents BIGINT NOT NULL DEFAULT 0,
  accepted_rules_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS scooters (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type ENUM('child','adult','professional') NOT NULL DEFAULT 'adult',
  battery TINYINT UNSIGNED NOT NULL DEFAULT 100,
  max_speed SMALLINT UNSIGNED NOT NULL DEFAULT 25,
  range_km DECIMAL(6,1) NOT NULL DEFAULT 25,
  price_per_minute_cents INT UNSIGNED NOT NULL DEFAULT 800,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  status ENUM('available','riding','maintenance') NOT NULL DEFAULT 'available',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_scooters_status (status, is_active),
  INDEX idx_scooters_location (latitude, longitude)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rides (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  scooter_id BIGINT UNSIGNED NOT NULL,
  status ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
  started_at DATETIME NOT NULL,
  ended_at DATETIME NULL,
  duration_minutes INT UNSIGNED NULL,
  total_cents BIGINT UNSIGNED NULL,
  tariff_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  prepaid_cents BIGINT UNSIGNED NOT NULL DEFAULT 0,
  start_latitude DECIMAL(10,7) NULL,
  start_longitude DECIMAL(10,7) NULL,
  end_latitude DECIMAL(10,7) NULL,
  end_longitude DECIMAL(10,7) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rides_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_rides_scooter FOREIGN KEY (scooter_id) REFERENCES scooters(id),
  INDEX idx_rides_user (user_id, created_at),
  INDEX idx_rides_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  ride_id BIGINT UNSIGNED NULL,
  type ENUM('topup','ride_charge','fine','refund','adjustment') NOT NULL,
  amount_cents BIGINT NOT NULL,
  description VARCHAR(255) NOT NULL,
  idempotency_key VARCHAR(100) NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_wallet_ride FOREIGN KEY (ride_id) REFERENCES rides(id),
  INDEX idx_wallet_user (user_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  admin_id BIGINT UNSIGNED NOT NULL,
  amount_cents BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(500) NOT NULL,
  status ENUM('unpaid','paid','cancelled') NOT NULL DEFAULT 'unpaid',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME NULL,
  CONSTRAINT fk_fines_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_fines_admin FOREIGN KEY (admin_id) REFERENCES users(id),
  INDEX idx_fines_user (user_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  admin_id BIGINT UNSIGNED NULL,
  title VARCHAR(120) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_notifications_admin FOREIGN KEY (admin_id) REFERENCES users(id),
  INDEX idx_notifications_user (user_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS favorites (
  user_id BIGINT UNSIGNED NOT NULL,
  scooter_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, scooter_id),
  CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_fav_scooter FOREIGN KEY (scooter_id) REFERENCES scooters(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  admin_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(60) NOT NULL,
  target_id BIGINT UNSIGNED NULL,
  details JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES users(id),
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;
