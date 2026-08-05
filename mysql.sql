CREATE DATABASE IF NOT EXISTS pg_management;
USE pg_management;

CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  phone VARCHAR(20),
  gender VARCHAR(20),
  dob DATE,
  address TEXT,
  room_number VARCHAR(20),
  rent INT DEFAULT 5500,
  due_day INT,
  join_date DATE,
  admission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  aadhar VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_number VARCHAR(20) UNIQUE,
  capacity INT,
  occupied INT DEFAULT 0,
  price INT
);

CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp VARCHAR(10) NOT NULL,
  expires_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_email VARCHAR(100),
  amount INT,
  status VARCHAR(50) DEFAULT 'Pending',
  screenshot VARCHAR(255),
  payment_method VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emi_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_email VARCHAR(100),
  total_amount INT,
  monthly_emi INT,
  months INT,
  paid_months INT DEFAULT 0,
  status VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  description VARCHAR(255),
  amount INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_email VARCHAR(100),
  complaint TEXT,
  status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  role VARCHAR(100),
  phone VARCHAR(20),
  salary INT
);

CREATE TABLE IF NOT EXISTS visitors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  phone VARCHAR(20),
  student VARCHAR(100),
  visit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS candidates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  mobile VARCHAR(20),
  email VARCHAR(100),
  gender VARCHAR(20),
  dob DATE,
  address TEXT,
  document VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Waiting',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_email VARCHAR(100),
  entry_time DATETIME,
  exit_time DATETIME
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_email VARCHAR(100),
  room_id INT,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS electricity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  total_bill INT,
  month VARCHAR(20),
  year INT
);

CREATE TABLE IF NOT EXISTS admission_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_email VARCHAR(100),
  amount INT,
  screenshot VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(100) UNIQUE,
  password VARCHAR(100)
);

INSERT IGNORE INTO admin (email, password)
VALUES ('salmabyali@gmail.com', 'admin123');

INSERT IGNORE INTO rooms(room_number,capacity,occupied,price) VALUES
('1',4,1,5500),('2',4,2,5500),('3',4,1,5500),('4',4,3,5500),
('5',4,1,5500),('6',4,2,5500),('7',4,1,5500),('8',4,3,5500),
('9',4,1,5500),('10',4,2,5500),('11',4,1,5500),('12',4,3,5500),
('13',4,1,5500),('14',4,2,5500),('15',4,1,5500),('16',4,3,5500),
('17',4,1,5500),('18',4,2,5500),('19',4,1,5500),('20',4,3,5500);

CREATE TABLE IF NOT EXISTS food_menu (
  id INT AUTO_INCREMENT PRIMARY KEY,
  day VARCHAR(20),
  breakfast VARCHAR(100),
  lunch VARCHAR(100),
  dinner VARCHAR(100)
);

INSERT INTO food_menu(day,breakfast,lunch,dinner)
SELECT * FROM (
  SELECT 'Monday','Poha','Rice + Dal','Roti + Sabji' UNION ALL
  SELECT 'Tuesday','Upma','Rice + Rajma','Roti + Paneer' UNION ALL
  SELECT 'Wednesday','Bread Omelette','Rice + Dal','Roti + Aloo' UNION ALL
  SELECT 'Thursday','Idli','Rice + Chole','Roti + Sabji' UNION ALL
  SELECT 'Friday','Paratha','Rice + Dal','Roti + Chicken' UNION ALL
  SELECT 'Saturday','Maggi','Rice + Veg Curry','Roti + Sabji' UNION ALL
  SELECT 'Sunday','Poori','Rice + Biryani','Light Dinner'
) AS menu_seed
WHERE NOT EXISTS (SELECT 1 FROM food_menu LIMIT 1);

CREATE TABLE IF NOT EXISTS notifications(
  id INT AUTO_INCREMENT PRIMARY KEY,
  message VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
