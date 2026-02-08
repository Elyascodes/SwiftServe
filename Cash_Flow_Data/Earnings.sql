CREATE DATABASE IF NOT EXISTS Earnings;
USE Earnings;
CREATE TABLE earnings_by_day(
    dates DATE,
    revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    cash_payments INT NOT NULL DEFAULT 0,
    card_payments INT NOT NULL DEFAULT 0,
    PRIMARY KEY (revenue)
);
CREATE TABLE earnings_by_week(
    start_of_week DATE,
    end_of_week DATE,
    revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    cash_payments INT NOT NULL DEFAULT 0,
    card_payments INT NOT NULL DEFAULT 0,
    PRIMARY KEY (revenue)
);
CREATE TABLE earnings_by_month(
    month DATE,
    revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    cash_payments INT NOT NULL DEFAULT 0,
    card_payments INT NOT NULL DEFAULT 0,
    PRIMARY KEY (revenue)
);