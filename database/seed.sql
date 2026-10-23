-- Optional demonstration data. Run only after database/schema.sql.
USE bloodlink_db;

INSERT INTO HOSPITALS (name, address, city, phone, email) VALUES
('St. Anne Medical Centre', '14 Garden Avenue', 'Boston', '617-555-0131', 'desk@stanne.example'),
('Northwood General Hospital', '82 Harrison Street', 'Cambridge', '617-555-0188', 'care@northwood.example');

INSERT INTO BLOOD_BANKS (name, address, city, phone, email, license_number) VALUES
('Central Community Blood Bank', '7 Beacon Road', 'Boston', '617-555-0140', 'central@bloodbank.example', 'MA-BB-2025-001'),
('Northside Donation Centre', '210 Elm Street', 'Cambridge', '617-555-0192', 'north@bloodbank.example', 'MA-BB-2025-002');

INSERT INTO DONORS (first_name, last_name, date_of_birth, gender, blood_group, phone, email, address, city, last_donation_date) VALUES
('Amelia', 'Hart', '1997-04-18', 'Female', 'O+', '617-555-0101', 'amelia@example.com', '33 Pine Street', 'Boston', '2025-01-19'),
('Noah', 'Bennett', '1992-09-03', 'Male', 'A-', '617-555-0102', 'noah@example.com', '18 Bay Road', 'Cambridge', '2025-02-04'),
('Maya', 'Patel', '1988-12-11', 'Female', 'B+', '617-555-0103', 'maya@example.com', '9 Oak Lane', 'Boston', NULL),
('Ethan', 'Cole', '2000-07-22', 'Male', 'AB+', '617-555-0104', 'ethan@example.com', '61 River Way', 'Somerville', '2025-02-18');

INSERT INTO RECIPIENTS (hospital_id, first_name, last_name, date_of_birth, gender, blood_group, phone, medical_reference) VALUES
(1, 'Oliver', 'Grant', '1978-03-08', 'Male', 'O+', '617-555-0121', 'SA-2025-1048'),
(2, 'Sofia', 'Reed', '1985-10-24', 'Female', 'A-', '617-555-0122', 'NW-2025-2217');

INSERT INTO BLOOD_INVENTORY (blood_bank_id, blood_group, units_available, minimum_threshold) VALUES
(1, 'A+', 18, 6), (1, 'A-', 4, 5), (1, 'B+', 11, 5), (1, 'B-', 3, 4),
(1, 'AB+', 7, 3), (1, 'AB-', 2, 3), (1, 'O+', 24, 8), (1, 'O-', 5, 6),
(2, 'A+', 10, 5), (2, 'O+', 14, 6), (2, 'B+', 8, 4);

INSERT INTO BLOOD_REQUESTS (recipient_id, hospital_id, blood_bank_id, blood_group, units_requested, urgency, status, required_by, notes) VALUES
(1, 1, 1, 'O+', 2, 'Critical', 'Pending', CURRENT_DATE, 'Operating theatre request'),
(2, 2, 1, 'A-', 2, 'Urgent', 'Approved', DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), 'Cross-match required by hospital');

INSERT INTO DONATIONS (donor_id, blood_bank_id, blood_group, units_donated, donation_date, notes) VALUES
(1, 1, 'O+', 1, '2025-01-19', 'Demonstration record'),
(2, 1, 'A-', 1, '2025-02-04', 'Demonstration record'),
(4, 2, 'AB+', 1, '2025-02-18', 'Demonstration record');

-- Demo login password is "BloodLinkDemo!" and must be changed before real use.
-- This bcrypt hash is demonstration-only; the application never stores plaintext passwords.
INSERT INTO STAFF_USERS (full_name, email, password_hash, role) VALUES
('Demo Administrator', 'admin@bloodlink.local', '$2b$10$EY71Cc6wjMB41AhreMc1J.3ZwH30x/aZlUmZOkkytu4VX0Dk0ZqIi', 'Administrator');
