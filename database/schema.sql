-- AVSK Portal Database Schema
-- Create Database
CREATE DATABASE IF NOT EXISTS avsk_portal;
USE avsk_portal;

-- Users Table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  mobile VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  account_status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  kyc_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
  kyc_document_url VARCHAR(255),
  wallet_balance DECIMAL(12, 2) DEFAULT 0.00,
  payable_balance DECIMAL(12, 2) DEFAULT 0.00,
  total_earned DECIMAL(12, 2) DEFAULT 0.00,
  total_withdrawn DECIMAL(12, 2) DEFAULT 0.00,
  referral_code VARCHAR(50) UNIQUE,
  profile_image_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_email (email),
  INDEX idx_mobile (mobile)
);

-- Bank Details Table
CREATE TABLE bank_details (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  account_holder_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(20) NOT NULL,
  ifsc_code VARCHAR(20) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  account_type ENUM('savings', 'current') DEFAULT 'savings',
  is_verified BOOLEAN DEFAULT FALSE,
  is_primary BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id)
);

-- UPI Details Table
CREATE TABLE upi_details (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  upi_id VARCHAR(100) UNIQUE NOT NULL,
  mobile_number VARCHAR(20),
  is_verified BOOLEAN DEFAULT FALSE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id)
);

-- Products Table (Admin can add/edit products)
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id VARCHAR(50) UNIQUE NOT NULL,
  product_name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  destination_url VARCHAR(500) NOT NULL,
  banner_image_url VARCHAR(255),
  commission_amount DECIMAL(10, 2) NOT NULL,
  commission_type ENUM('fixed', 'percentage') DEFAULT 'fixed',
  status ENUM('active', 'inactive', 'paused') DEFAULT 'active',
  duplicate_lead_timeframe INT DEFAULT 86400,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_product_id (product_id),
  INDEX idx_status (status),
  INDEX idx_category (category)
);

-- Referral Links Table
CREATE TABLE referral_links (
  id INT PRIMARY KEY AUTO_INCREMENT,
  link_id VARCHAR(100) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  referral_url VARCHAR(500),
  click_count INT DEFAULT 0,
  conversion_count INT DEFAULT 0,
  total_commission DECIMAL(12, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_link_id (link_id),
  INDEX idx_user_id (user_id),
  INDEX idx_product_id (product_id),
  UNIQUE KEY unique_user_product (user_id, product_id)
);

-- Clicks Table (Track all clicks)
CREATE TABLE clicks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  referral_link_id INT NOT NULL,
  ip_address VARCHAR(50),
  user_agent VARCHAR(500),
  referrer_url VARCHAR(500),
  clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (referral_link_id) REFERENCES referral_links(id),
  INDEX idx_referral_link_id (referral_link_id),
  INDEX idx_clicked_at (clicked_at)
);

-- Leads Table (Lead Capture Page Submissions)
CREATE TABLE leads (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lead_id VARCHAR(100) UNIQUE NOT NULL,
  referral_link_id INT NOT NULL,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  customer_mobile VARCHAR(20) NOT NULL,
  customer_email VARCHAR(100),
  lead_status ENUM('pending', 'approved', 'rejected', 'converted') DEFAULT 'pending',
  commission_status ENUM('pending', 'approved', 'rejected', 'paid') DEFAULT 'pending',
  commission_amount DECIMAL(10, 2),
  ip_address VARCHAR(50),
  device_info VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  approved_by INT,
  approval_notes TEXT,
  FOREIGN KEY (referral_link_id) REFERENCES referral_links(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  INDEX idx_lead_id (lead_id),
  INDEX idx_user_id (user_id),
  INDEX idx_product_id (product_id),
  INDEX idx_customer_mobile (customer_mobile),
  INDEX idx_lead_status (lead_status),
  INDEX idx_commission_status (commission_status),
  INDEX idx_created_at (created_at)
);

-- Wallet Transactions Table
CREATE TABLE wallet_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  transaction_id VARCHAR(100) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  lead_id INT,
  transaction_type ENUM('credit', 'debit') NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  balance_before DECIMAL(12, 2),
  balance_after DECIMAL(12, 2),
  status ENUM('pending', 'completed', 'failed', 'reversed') DEFAULT 'pending',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (lead_id) REFERENCES leads(id),
  INDEX idx_user_id (user_id),
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_created_at (created_at)
);

-- Withdrawal Requests Table
CREATE TABLE withdrawal_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  withdrawal_id VARCHAR(100) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  bank_detail_id INT,
  upi_detail_id INT,
  withdrawal_method ENUM('bank', 'upi') NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'processing', 'completed', 'failed') DEFAULT 'pending',
  admin_remarks TEXT,
  processed_by INT,
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (bank_detail_id) REFERENCES bank_details(id),
  FOREIGN KEY (upi_detail_id) REFERENCES upi_details(id),
  FOREIGN KEY (processed_by) REFERENCES users(id),
  INDEX idx_user_id (user_id),
  INDEX idx_withdrawal_id (withdrawal_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Duplicate Lead Check Table (Anti-Fraud)
CREATE TABLE duplicate_lead_checks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  customer_mobile VARCHAR(20) NOT NULL,
  last_lead_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_product_mobile (product_id, customer_mobile),
  UNIQUE KEY unique_product_mobile (product_id, customer_mobile)
);

-- Admin Audit Logs Table
CREATE TABLE audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(50),
  user_agent VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id),
  INDEX idx_admin_id (admin_id),
  INDEX idx_action_type (action_type),
  INDEX idx_created_at (created_at)
);

-- Settings Table (For admin configurations)
CREATE TABLE settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Promotional Templates Table
CREATE TABLE promotional_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id VARCHAR(50) UNIQUE NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  template_message TEXT NOT NULL,
  placeholder_tags JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_template_id (template_id)
);

-- Create Indexes for Performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_account_status ON users(account_status);
CREATE INDEX idx_leads_commission_status ON leads(commission_status);
CREATE INDEX idx_withdrawal_requests_status ON withdrawal_requests(status);
