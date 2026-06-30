-- Migration 00034: Add ingredient_id to stock_receipts and stock_dispatches
-- This migration adds support for tracking ingredients in receipts and dispatches.

ALTER TABLE stock_receipts ADD COLUMN IF NOT EXISTS ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE;
ALTER TABLE stock_dispatches ADD COLUMN IF NOT EXISTS ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE;
