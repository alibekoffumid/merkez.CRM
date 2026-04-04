-- Initial Schema for Merkez CRM

-- Categories for the Restaurant
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Products/Dishes
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tables in the restaurant
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL,
  capacity INT NOT NULL,
  status TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Customers for CRM
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  type TEXT DEFAULT 'Regular',
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (Row Level Security) - Enable for all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create Policies (Allow public read for now, proper auth later)
CREATE POLICY "Allow public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow public read tables" ON restaurant_tables FOR SELECT USING (true);
CREATE POLICY "Allow public read customers" ON customers FOR SELECT USING (true);

-- SEED DATA
DO $$ 
DECLARE 
    cat_pizza_id UUID;
    cat_burger_id UUID;
    cat_drink_id UUID;
    cat_dessert_id UUID;
    cat_salad_id UUID;
BEGIN
    -- Insert Categories and store IDs
    INSERT INTO categories (name, icon) VALUES ('Pizza', 'Pizza') RETURNING id INTO cat_pizza_id;
    INSERT INTO categories (name, icon) VALUES ('Burgers', 'Burger') RETURNING id INTO cat_burger_id;
    INSERT INTO categories (name, icon) VALUES ('Drinks', 'CupSoda') RETURNING id INTO cat_drink_id;
    INSERT INTO categories (name, icon) VALUES ('Desserts', 'Cake') RETURNING id INTO cat_dessert_id;
    INSERT INTO categories (name, icon) VALUES ('Salads', 'Salad') RETURNING id INTO cat_salad_id;

    -- Insert Products (Restaurant Menu)
    INSERT INTO products (category_id, name, price, description) VALUES 
    (cat_pizza_id, 'Margherita', 12.50, 'Classic tomato, mozzarella, and basil.'),
    (cat_pizza_id, 'Pepperoni', 14.90, 'Spicy pepperoni with aged mozzarella.'),
    (cat_pizza_id, 'Four Cheese', 16.00, 'Mozzarella, Gorgonzola, Parmesan, Fontina.'),
    (cat_burger_id, 'Classic Beef', 9.50, 'Juicy 200g beef patty with fresh lettuce.'),
    (cat_burger_id, 'Cheeseburger', 10.50, 'Double cheese with special burger sauce.'),
    (cat_drink_id, 'Fresh Lemonade', 4.50, 'Hand-squeezed lemons with mint.'),
    (cat_drink_id, 'Craft Beer', 7.00, 'Local brewery IPA.'),
    (cat_dessert_id, 'Tiramisu', 6.50, 'Italian classic with coffee and mascarpone.'),
    (cat_salad_id, 'Caesar', 11.00, 'Green salad with chicken and parmesan croutons.');

    -- Insert Tables
    INSERT INTO restaurant_tables (number, capacity, status) VALUES 
    ('T1', 2, 'free'), ('T2', 4, 'occupied'), ('T3', 4, 'reserved'), 
    ('T4', 6, 'occupied'), ('T5', 2, 'free'), ('V1', 4, 'reserved'),
    ('V2', 2, 'free'), ('T6', 8, 'occupied');

    -- Insert Customers (CRM Leads)
    INSERT INTO customers (name, phone, email, type, address) VALUES 
    ('Aleksandr Ivanov', '+7 (999) 123-4567', 'ivanov@example.com', 'Regular', 'Moscow, Tverskaya 5'),
    ('Maria Garcia', '+34 (600) 456-789', 'm.garcia@example.com', 'VIP', 'Barcelona, Carrer de Balmes'),
    ('David Smith', '+1 (555) 019-2233', 'd.smith@example.com', 'Regular', 'NY, 5th Ave 144'),
    ('Elena Rostova', '+7 (900) 777-1122', 'e.rostova@example.com', 'VIP', 'Saint Petersburg, Nevsky 21'),
    ('Julian Moon', '+44 (20) 7946-0123', 'j.moon@example.com', 'Regular', 'London, Oxford St.'),
    ('Amelie Paul', '+33 (1) 42-65-81-00', 'a.paul@example.com', 'Regular', 'Paris, Rue de Rivoli'),
    ('Kenji Sato', '+81 (3) 1234-5678', 'k.sato@example.com', 'VIP', 'Tokyo, Shibuya-ku'),
    ('Luca Rossi', '+39 (06) 123-4567', 'l.rossi@example.com', 'Regular', 'Rome, Via del Corso');

END $$;
