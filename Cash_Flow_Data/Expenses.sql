CREATE TABLE worker_pay(
    worker_id INT,
    worker_name VARCHAR(100),
    hours_worked DECIMAL(2,1) NOT NULL DEFAULT 0.0,
    pay DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    dates DATE,
    PRIMARY KEY (worker_id)
)

CREATE TABLE Electricity_Bill(
    billing_name VARCHAR(100),
    description VARCHAR(250) NOT NULL DEFAULT '',
    cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    dates DATE,
    PRIMARY KEY (billing_name)
)

CREATE TABLE food_cost(
    billing_name VARCHAR(100),
    cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    dates DATE,
    PRIMARY KEY (billing_name)
)

CREATE TABLE cleaning_bill(
    billing_name VARCHAR(100),
    description VARCHAR(250) NOT NULL DEFAULT '',
    cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    dates DATE,
    PRIMARY KEY (billing_name)
)

CREATE TABLE miscellaneous_cost(
    billing_name VARCHAR(100),
    description VARCHAR(250) NOT NULL DEFAULT '',
    cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    dates DATE,
    PRIMARY KEY (billing_name)
)

CREATE TABLE maintenance_cost(
    billing_name VARCHAR(100),
    description VARCHAR(250) NOT NULL DEFAULT '',
    cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    dates DATE,
    PRIMARY KEY (billing_name)
)

CREATE TABLE water_cost(
    billing_name VARCHAR(100),
    description VARCHAR(250) NOT NULL DEFAULT '',
    cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    dates DATE,
    PRIMARY KEY (billing_name)
)

CREATE TABLE HVAC_cost(
    billing_name VARCHAR(100),
    description VARCHAR(250) NOT NULL DEFAULT '',
    cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    dates DATE,
    PRIMARY KEY (billing_name)
)

CREATE TABLE internet_cost(
    billing_name VARCHAR(100),
    description VARCHAR(250) NOT NULL DEFAULT '',
    cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    dates DATE,
    PRIMARY KEY (billing_name)
)

CREATE TABLE phone_bill(
    billing_name VARCHAR(100),
    description VARCHAR(250) NOT NULL DEFAULT '',
    cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    dates DATE,
    PRIMARY KEY (billing_name)
)

CREATE TABLE insurance_cost(
    billing_name VARCHAR(100),
    description VARCHAR(250) NOT NULL DEFAULT '',
    cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    dates DATE,
    PRIMARY KEY (billing_name)
)

CREATE TABLE taxes(
    billing_name VARCHAR(100),
    description VARCHAR(250) NOT NULL DEFAULT '',
    cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    dates DATE,
    PRIMARY KEY (billing_name)
)

CREATE TABLE television_cost(
    billing_name VARCHAR(100),
    description VARCHAR(250) NOT NULL DEFAULT '',
    cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    dates DATE,
    PRIMARY KEY (billing_name)
)