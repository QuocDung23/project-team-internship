-- Adds persistent demo driver codes to an existing database.
-- Run this once before deploying code that requires drivers.driver_code.

ALTER TABLE drivers
    ADD COLUMN IF NOT EXISTS driver_code VARCHAR(20);

WITH numbered AS (
    SELECT
        driver_id,
        row_number() OVER (ORDER BY created_at, full_name, driver_id) AS row_num
    FROM drivers
)
UPDATE drivers d
SET driver_code = 'DRV-' || lpad(numbered.row_num::text, 3, '0')
FROM numbered
WHERE d.driver_id = numbered.driver_id;

ALTER TABLE drivers
    ALTER COLUMN driver_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_drivers_driver_code
    ON drivers(driver_code);
