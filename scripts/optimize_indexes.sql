-- Optimization Indexes for Transactions
CREATE INDEX idx_transactions_status ON transactions (status);

CREATE INDEX idx_transactions_customerNo ON transactions (customerNo);

CREATE INDEX idx_transactions_createdAt ON transactions (createdAt);

-- Optimization Indexes for Products
CREATE INDEX idx_products_sku ON products (sku);

CREATE INDEX idx_products_isActive ON products (isActive);