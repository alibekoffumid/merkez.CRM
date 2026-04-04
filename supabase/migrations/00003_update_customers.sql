-- Update customers table to support CRM status and requests
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'NEW';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS initial_request TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(10, 2) DEFAULT 0;

-- Update existing seeds with random statuses and requests
UPDATE customers SET status = 'NEW', initial_request = 'Inquiry about enterprise software licensing.', estimated_value = 12000 WHERE name = 'Aleksandr Ivanov';
UPDATE customers SET status = 'CONTACTED', initial_request = 'Wants to schedule a consultation for marketing services.', estimated_value = 3500 WHERE name = 'Maria Garcia';
UPDATE customers SET status = 'FOLLOW_UP', initial_request = 'Requires technical support for hardware.', estimated_value = 0 WHERE name = 'David Smith';
UPDATE customers SET status = 'CONVERTED', initial_request = 'Looking for a premium partnership plan.', estimated_value = 45000 WHERE name = 'Elena Rostova';
UPDATE customers SET status = 'NEW', initial_request = 'New web lead for consulting.', estimated_value = 5000 WHERE status IS NULL;
