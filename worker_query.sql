CREATE DATABASE IF NOT EXISTS restaurant_db;
USE restaurant_db;

DROP TABLE IF EXISTS workers;

CREATE TABLE workers (
    worker_id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(50) NOT NULL,
    last_name  VARCHAR(50) NOT NULL,
    role       VARCHAR(30) NOT NULL,
    hourly_wage DECIMAL(5,2) NOT NULL
);

INSERT INTO workers (first_name, last_name, role, hourly_wage) VALUES
-- 1 Manager
('Alice',  'Johnson', 'Manager', 25.00),

-- 5 Waiters
('Bob',    'Smith',   'Waiter', 12.50),
('Eva',    'Brown',   'Waiter', 12.50),
('Liam',   'White',   'Waiter', 12.50),
('Noah',   'Clark',   'Waiter', 12.50),
('Mia',    'Davis',   'Waiter', 12.50),

-- 2 Busboys
('Carlos', 'Diaz',    'Busboy', 10.00),
('Jake',   'Wilson',  'Busboy', 10.00),

-- 5 Kitchen Staff
('Dana',   'Lee',     'Kitchen Staff', 15.00),
('Sophia', 'Martinez','Kitchen Staff', 15.00),
('Ethan',  'Hall',    'Kitchen Staff', 15.00),
('Olivia', 'Allen',   'Kitchen Staff', 15.00),
('Lucas',  'Young',   'Kitchen Staff', 15.00);

SELECT role, COUNT(*) AS total_workers
FROM workers
GROUP BY role
ORDER BY total_workers DESC;