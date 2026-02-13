USE restaurant_db;

DROP TABLE IF EXISTS menu_items;
USE restaurant_db;
USE restaurant_db;

CREATE TABLE menu_items (
  item_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  ingredients TEXT NULL,
  price DECIMAL(8,2) NOT NULL,
  stock INT NULL,
  expiration_date DATE NULL,
  category VARCHAR(50) NOT NULL,
  items_sold INT NOT NULL DEFAULT 0,
  total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0.00
);

INSERT INTO menu_items (name, ingredients, price, stock, expiration_date, category, items_sold, total_revenue) VALUES
-- Appetizers
('Chicken Nachos', NULL, 8.50, NULL, NULL, 'Appetizer', 0, 0.00),
('Pork Nachos', NULL, 8.50, NULL, NULL, 'Appetizer', 0, 0.00),
('Pork or Chicken Sliders (3)', NULL, 5.00, NULL, NULL, 'Appetizer', 0, 0.00),
('Catfish Bites', NULL, 6.50, NULL, NULL, 'Appetizer', 0, 0.00),
('Fried Veggies', NULL, 6.50, NULL, NULL, 'Appetizer', 0, 0.00),

-- Salads
('House Salad', NULL, 7.50, NULL, NULL, 'Salad', 0, 0.00),
('Wedge Salad', NULL, 7.50, NULL, NULL, 'Salad', 0, 0.00),
('Caesar Salad', NULL, 7.50, NULL, NULL, 'Salad', 0, 0.00),
('Sweet Potato Chicken Salad', NULL, 11.50, NULL, NULL, 'Salad', 0, 0.00),

-- Entrees
('Shrimp & Grits', NULL, 13.50, NULL, NULL, 'Entree', 0, 0.00),
('Sweet Tea Fried Chicken', NULL, 11.50, NULL, NULL, 'Entree', 0, 0.00),
('Caribbean Chicken', NULL, 11.50, NULL, NULL, 'Entree', 0, 0.00),
('Grilled Pork Chops', NULL, 11.00, NULL, NULL, 'Entree', 0, 0.00),
('New York Strip Steak', NULL, 17.00, NULL, NULL, 'Entree', 0, 0.00),
('Seared Tuna', NULL, 15.00, NULL, NULL, 'Entree', 0, 0.00),
('Captain Crunch Chicken Tenders', NULL, 11.50, NULL, NULL, 'Entree', 0, 0.00),
('Shock Top Grouper Fingers', NULL, 11.50, NULL, NULL, 'Entree', 0, 0.00),
('Mac & Cheese Bar', NULL, 8.50, NULL, NULL, 'Entree', 0, 0.00),

-- Sandwiches
('Grilled Cheese', NULL, 5.50, NULL, NULL, 'Sandwich', 0, 0.00),
('Chicken BLT&A', NULL, 10.00, NULL, NULL, 'Sandwich', 0, 0.00),
('Philly', NULL, 13.50, NULL, NULL, 'Sandwich', 0, 0.00),
('Club', NULL, 10.00, NULL, NULL, 'Sandwich', 0, 0.00),
('Meatball Sub', NULL, 10.00, NULL, NULL, 'Sandwich', 0, 0.00),

-- Burgers
('Bacon Cheeseburger', NULL, 11.00, NULL, NULL, 'Burger', 0, 0.00),
('Carolina Burger', NULL, 11.00, NULL, NULL, 'Burger', 0, 0.00),
('Portobello Burger (V)', NULL, 8.50, NULL, NULL, 'Burger', 0, 0.00),
('Vegan Boca Burger (V)', NULL, 10.50, NULL, NULL, 'Burger', 0, 0.00),

-- Beverages
('Sweet / Unsweetened Tea', NULL, 2.00, NULL, NULL, 'Beverage', 0, 0.00),
('Coke / Diet Coke', NULL, 2.00, NULL, NULL, 'Beverage', 0, 0.00),
('Sprite', NULL, 2.00, NULL, NULL, 'Beverage', 0, 0.00),
('Bottled Water', NULL, 2.00, NULL, NULL, 'Beverage', 0, 0.00),
('Lemonade', NULL, 2.00, NULL, NULL, 'Beverage', 0, 0.00),
('Orange Juice', NULL, 2.00, NULL, NULL, 'Beverage', 0, 0.00),

-- Sides ($2.50)
('Curly Fries', NULL, 2.50, NULL, NULL, 'Side', 0, 0.00),
('Wing Chips', NULL, 2.50, NULL, NULL, 'Side', 0, 0.00),
('Sweet Potato Fries', NULL, 2.50, NULL, NULL, 'Side', 0, 0.00),
('Creamy Cabbage Slaw', NULL, 2.50, NULL, NULL, 'Side', 0, 0.00),
('Adluh Cheese Grits', NULL, 2.50, NULL, NULL, 'Side', 0, 0.00),
('Mashed Potatoes', NULL, 2.50, NULL, NULL, 'Side', 0, 0.00),
('Mac & Cheese (Side)', NULL, 2.50, NULL, NULL, 'Side', 0, 0.00),
('Seasonal Vegetables', NULL, 2.50, NULL, NULL, 'Side', 0, 0.00);
SELECT COUNT(*) AS total_rows FROM menu_items;

SELECT name, COUNT(*) AS how_many
FROM menu_items
GROUP BY name
HAVING COUNT(*) > 1;
SELECT COUNT(*) AS total_rows FROM menu_items;

SELECT * FROM menu_items;
USE restaurant_db;

ALTER TABLE menu_items
ADD COLUMN is_active TINYINT(1) DEFAULT 1;
SELECT * FROM menu_items;