-- Migration to add article_number column to products table if missing
ALTER TABLE products ADD COLUMN IF NOT EXISTS article_number TEXT;
