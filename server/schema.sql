-- ================================================
-- MuseumPass Database Schema
-- Run this file in MySQL to set up the database
-- ================================================

CREATE DATABASE IF NOT EXISTS museumpass CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE museumpass;

-- ------------------------------------------------
-- CUSTOMERS
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  phone       VARCHAR(20),
  password    VARCHAR(255) NOT NULL,
  is_verified TINYINT(1) DEFAULT 0,
  otp         VARCHAR(10),
  otp_expiry  DATETIME,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------
-- EMPLOYEES
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(20) NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) UNIQUE,
  phone       VARCHAR(20),
  password    VARCHAR(255) NOT NULL,
  role        ENUM('ticket_verifier','customer_support','walk_in_entry') DEFAULT 'ticket_verifier',
  museum_id   INT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------
-- ADMINS
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(50) NOT NULL UNIQUE,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) UNIQUE,
  password   VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------
-- MUSEUMS
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS museums (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  city          VARCHAR(100) NOT NULL,
  location      VARCHAR(255),
  category      ENUM('Natural History','Science & Tech','Art','History','Other') DEFAULT 'Other',
  description   TEXT,
  image         VARCHAR(255) DEFAULT 'assets/museum_natural.png',
  rating        DECIMAL(2,1) DEFAULT 4.5,
  review_count  INT DEFAULT 0,
  price_adult   DECIMAL(8,2) DEFAULT 20.00,
  price_child   DECIMAL(8,2) DEFAULT 12.00,
  price_senior  DECIMAL(8,2) DEFAULT 15.00,
  open_hours    VARCHAR(100) DEFAULT '9:00 AM – 6:00 PM',
  closed_day    VARCHAR(50) DEFAULT 'Monday',
  capacity      INT DEFAULT 500,
  is_active     TINYINT(1) DEFAULT 1,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------
-- EXHIBITIONS
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS exhibitions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  museum_id   INT NOT NULL,
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  start_date  DATE,
  end_date    DATE,
  is_active   TINYINT(1) DEFAULT 1,
  FOREIGN KEY (museum_id) REFERENCES museums(id) ON DELETE CASCADE
);

-- ------------------------------------------------
-- BOOKINGS
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  booking_ref    VARCHAR(20) NOT NULL UNIQUE,
  customer_id    INT,
  customer_name  VARCHAR(100) NOT NULL,
  customer_email VARCHAR(150),
  customer_phone VARCHAR(20),
  museum_id      INT NOT NULL,
  visit_date     DATE NOT NULL,
  visit_time     VARCHAR(20) NOT NULL,
  adults         INT DEFAULT 0,
  children       INT DEFAULT 0,
  seniors        INT DEFAULT 0,
  total_amount   DECIMAL(10,2) NOT NULL,
  payment_status ENUM('pending','paid','refunded') DEFAULT 'paid',
  payment_method VARCHAR(50) DEFAULT 'card',
  status         ENUM('confirmed','cancelled','completed') DEFAULT 'confirmed',
  qr_data        VARCHAR(255),
  is_walk_in     TINYINT(1) DEFAULT 0,
  created_by_emp INT,
  notes          TEXT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (museum_id) REFERENCES museums(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_emp) REFERENCES employees(id) ON DELETE SET NULL
);

-- ------------------------------------------------
-- REVIEWS
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  museum_id   INT NOT NULL,
  customer_id INT,
  author_name VARCHAR(100) NOT NULL,
  rating      TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (museum_id) REFERENCES museums(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- ------------------------------------------------
-- CUSTOMER QUERIES
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS queries (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  booking_ref   VARCHAR(20),
  category      VARCHAR(100),
  description   TEXT NOT NULL,
  priority      ENUM('low','medium','high') DEFAULT 'medium',
  status        ENUM('open','in_progress','resolved') DEFAULT 'open',
  handled_by    INT,
  resolution    TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (handled_by) REFERENCES employees(id) ON DELETE SET NULL
);

-- ------------------------------------------------
-- SEED DATA – Admin
-- ------------------------------------------------
INSERT IGNORE INTO admins (username, name, email, password) VALUES
('admin', 'Dr. Elena Rhodes', 'admin@museum.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');
-- password: password (bcrypt hash above)
-- For real usage, run: node seed.js

-- ------------------------------------------------
-- SEED DATA – Museums
-- ------------------------------------------------
INSERT IGNORE INTO museums (id, name, city, location, category, description, image, rating, review_count, price_adult, price_child, price_senior, open_hours, closed_day, capacity) VALUES
(1,'The Grand Natural History Museum','New York','Central Park West, New York, NY','Natural History','Explore millions of years of Earth history through world-class fossil exhibits, ancient artifacts, and live natural specimens. A journey through time awaits.','assets/museum_natural.png',4.8,1240,22.00,12.00,16.00,'9:00 AM – 6:00 PM','Monday',500),
(2,'National Science & Technology Museum','Chicago','Museum Campus, Chicago, IL','Science & Tech','Discover the wonders of science and technology with hands-on exhibits, interactive labs, and cutting-edge innovations shaping our future.','assets/museum_science.png',4.6,980,18.00,10.00,13.00,'10:00 AM – 7:00 PM','Tuesday',400),
(3,'Contemporary Art Gallery','Los Angeles','Grand Ave, Los Angeles, CA','Art','Immerse yourself in the vibrant world of contemporary art featuring works from globally renowned artists across painting, sculpture, and digital media.','assets/museum_art.png',4.7,760,20.00,10.00,14.00,'11:00 AM – 8:00 PM','Wednesday',350),
(4,'Ancient Civilizations Museum','Washington D.C.','National Mall, Washington D.C.','History','Travel back thousands of years through magnificent collections of Egyptian, Greek, Roman, and Mesopotamian treasures. History comes alive here.','assets/museum_ancient.png',4.9,1560,25.00,14.00,18.00,'9:00 AM – 5:30 PM','Thursday',600),
(5,'Space Exploration Center','Houston','Space Center Blvd, Houston, TX','Science & Tech','Blast off into the cosmos with NASA-grade exhibits, authentic spacecraft, VR space missions, and interactive astronaut training simulations.','assets/museum_space.png',4.9,2100,28.00,16.00,20.00,'9:00 AM – 7:00 PM','None',800);

-- ------------------------------------------------
-- SEED DATA – Exhibitions
-- ------------------------------------------------
INSERT IGNORE INTO exhibitions (museum_id, name) VALUES
(1,'Dinosaur Hall'),(1,'Ocean Life'),(1,'Ancient Egypt'),(1,'Human Origins'),
(2,'Space Tech'),(2,'AI & Robotics'),(2,'Energy Lab'),(2,'Future Cities'),
(3,'Modern Masters'),(3,'Digital Dreams'),(3,'Abstract Worlds'),(3,'Photography Now'),
(4,'Egyptian Treasures'),(4,'Greek Mythology'),(4,'Roman Empire'),(4,'Mesopotamia'),
(5,'Apollo Missions'),(5,'Mars Exploration'),(5,'ISS Experience'),(5,'Astronaut Training');

-- ------------------------------------------------
-- SEED DATA – Employee (password: staff123)
-- ------------------------------------------------
INSERT IGNORE INTO employees (employee_id, name, email, password, role, museum_id) VALUES
('EMP001','James Carter','james@museum.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh9y','ticket_verifier',1),
('EMP002','Sarah Mitchell','sarah@museum.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh9y','customer_support',2),
('EMP003','David Park','david@museum.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh9y','walk_in_entry',3);
-- All employee passwords: staff123
