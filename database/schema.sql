CREATE DATABASE IF NOT EXISTS bloodlink_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE bloodlink_db;

CREATE TABLE IF NOT EXISTS HOSPITALS (
  hospital_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(80) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(150) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_hospitals_name_city UNIQUE (name, city),
  CONSTRAINT uq_hospitals_email UNIQUE (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS BLOOD_BANKS (
  blood_bank_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(80) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(150) NULL,
  license_number VARCHAR(60) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_blood_banks_license UNIQUE (license_number),
  CONSTRAINT uq_blood_banks_email UNIQUE (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS DONORS (
  donor_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(70) NOT NULL,
  last_name VARCHAR(70) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender ENUM('Male','Female','Other','Prefer not to say') NOT NULL,
  blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(150) NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(80) NOT NULL,
  last_donation_date DATE NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_donors_phone UNIQUE (phone),
  CONSTRAINT uq_donors_email UNIQUE (email)
) ENGINE=InnoDB;
CREATE INDEX idx_donors_blood_group ON DONORS (blood_group);
CREATE INDEX idx_donors_name ON DONORS (last_name, first_name);
CREATE INDEX idx_donors_city ON DONORS (city);

CREATE TABLE IF NOT EXISTS RECIPIENTS (
  recipient_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  hospital_id INT UNSIGNED NOT NULL,
  first_name VARCHAR(70) NOT NULL,
  last_name VARCHAR(70) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender ENUM('Male','Female','Other','Prefer not to say') NOT NULL,
  blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  phone VARCHAR(20) NULL,
  medical_reference VARCHAR(80) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_recipients_medical_reference UNIQUE (medical_reference),
  CONSTRAINT fk_recipients_hospital FOREIGN KEY (hospital_id)
    REFERENCES HOSPITALS (hospital_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE INDEX idx_recipients_hospital ON RECIPIENTS (hospital_id);
CREATE INDEX idx_recipients_blood_group ON RECIPIENTS (blood_group);

CREATE TABLE IF NOT EXISTS BLOOD_INVENTORY (
  inventory_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  blood_bank_id INT UNSIGNED NOT NULL,
  blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  units_available INT UNSIGNED NOT NULL DEFAULT 0,
  minimum_threshold INT UNSIGNED NOT NULL DEFAULT 5,
  last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_inventory_bank_group UNIQUE (blood_bank_id, blood_group),
  CONSTRAINT chk_inventory_units CHECK (units_available >= 0),
  CONSTRAINT chk_inventory_threshold CHECK (minimum_threshold >= 0),
  CONSTRAINT fk_inventory_bank FOREIGN KEY (blood_bank_id)
    REFERENCES BLOOD_BANKS (blood_bank_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE INDEX idx_inventory_group ON BLOOD_INVENTORY (blood_group);

CREATE TABLE IF NOT EXISTS BLOOD_REQUESTS (
  request_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  recipient_id INT UNSIGNED NOT NULL,
  hospital_id INT UNSIGNED NOT NULL,
  blood_bank_id INT UNSIGNED NOT NULL,
  blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  units_requested INT UNSIGNED NOT NULL,
  urgency ENUM('Routine','Urgent','Critical') NOT NULL DEFAULT 'Routine',
  status ENUM('Pending','Approved','Fulfilled','Cancelled') NOT NULL DEFAULT 'Pending',
  required_by DATE NOT NULL,
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_request_units CHECK (units_requested > 0),
  CONSTRAINT fk_requests_recipient FOREIGN KEY (recipient_id)
    REFERENCES RECIPIENTS (recipient_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_requests_hospital FOREIGN KEY (hospital_id)
    REFERENCES HOSPITALS (hospital_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_requests_bank FOREIGN KEY (blood_bank_id)
    REFERENCES BLOOD_BANKS (blood_bank_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE INDEX idx_requests_status_urgency ON BLOOD_REQUESTS (status, urgency);
CREATE INDEX idx_requests_required_by ON BLOOD_REQUESTS (required_by);

CREATE TABLE IF NOT EXISTS DONATIONS (
  donation_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  donor_id INT UNSIGNED NOT NULL,
  blood_bank_id INT UNSIGNED NOT NULL,
  blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  units_donated INT UNSIGNED NOT NULL DEFAULT 1,
  donation_date DATE NOT NULL,
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_donation_units CHECK (units_donated > 0),
  CONSTRAINT fk_donations_donor FOREIGN KEY (donor_id)
    REFERENCES DONORS (donor_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_donations_bank FOREIGN KEY (blood_bank_id)
    REFERENCES BLOOD_BANKS (blood_bank_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE INDEX idx_donations_donor_date ON DONATIONS (donor_id, donation_date);
CREATE INDEX idx_donations_bank_group ON DONATIONS (blood_bank_id, blood_group);

CREATE TABLE IF NOT EXISTS STAFF_USERS (
  staff_user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(140) NOT NULL,
  email VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('Administrator','Coordinator','Viewer') NOT NULL DEFAULT 'Viewer',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_staff_email UNIQUE (email)
) ENGINE=InnoDB;
