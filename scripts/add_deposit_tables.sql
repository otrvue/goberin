-- Create payment_settings table
CREATE TABLE IF NOT EXISTS payment_settings (
    id VARCHAR(36) PRIMARY KEY,
    `key` VARCHAR(100) UNIQUE NOT NULL,
    `value` TEXT,
    `group` VARCHAR(50),
    updatedAt DATETIME NOT NULL
);

-- Create deposits table
CREATE TABLE IF NOT EXISTS deposits (
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    externalId VARCHAR(100),
    amount DECIMAL(20, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'IDR',
    method VARCHAR(50) NOT NULL,
    reference VARCHAR(100) UNIQUE NOT NULL,
    status ENUM(
        'PENDING',
        'PAID',
        'CANCELLED',
        'EXPIRED'
    ) DEFAULT 'PENDING',
    qrData JSON,
    paymentData JSON,
    expiresAt DATETIME NOT NULL,
    paidAt DATETIME,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    INDEX (userId),
    INDEX (status),
    INDEX (reference)
);

-- Insert initial DompetX settings
INSERT IGNORE INTO
    payment_settings (
        id,
        `key`,
        `value`,
        `group`,
        updatedAt
    )
VALUES (
        UUID(),
        'dompetx_api_key',
        '',
        'DOMPETX',
        NOW()
    ),
    (
        UUID(),
        'dompetx_status',
        'inactive',
        'DOMPETX',
        NOW()
    );