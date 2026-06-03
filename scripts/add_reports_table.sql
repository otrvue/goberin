CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(191) PRIMARY KEY,
    transactionId VARCHAR(191) NOT NULL,
    userId VARCHAR(191) NOT NULL,
    message TEXT NOT NULL,
    status ENUM(
        'PENDING',
        'PROCESSED',
        'REJECTED'
    ) DEFAULT 'PENDING',
    keterangan TEXT,
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    FOREIGN KEY (transactionId) REFERENCES transactions (id),
    FOREIGN KEY (userId) REFERENCES users (id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;