USE volt_ride;
-- Apply once to an existing database created from the previous VOLT RIDE schema.
UPDATE scooters SET status='available' WHERE status='reserved';
ALTER TABLE rides DROP FOREIGN KEY fk_rides_reservation;
ALTER TABLE rides DROP COLUMN reservation_id;
ALTER TABLE rides ADD COLUMN tariff_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 0, ADD COLUMN prepaid_cents BIGINT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE scooters MODIFY status ENUM('available','riding','maintenance') NOT NULL DEFAULT 'available';
DROP TABLE IF EXISTS reservations;
