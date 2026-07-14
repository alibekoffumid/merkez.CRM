
-- Скрипт для добавления товаров для аккаунта demo@merkez.com

DO $$
DECLARE
    v_user_id UUID;
    v_category_id UUID;
BEGIN
    -- Находим ID пользователя
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'demo@merkez.com' LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Пользователь demo@merkez.com не найден';
    END IF;

    -- Находим или создаем категорию 'Musiqi Alətləri' для этого пользователя
    SELECT id INTO v_category_id FROM public.categories WHERE name = 'Musiqi Alətləri' AND user_id = v_user_id LIMIT 1;
    
    IF v_category_id IS NULL THEN
        v_category_id := gen_random_uuid();
        INSERT INTO public.categories (id, name, user_id, is_deleted) 
        VALUES (v_category_id, 'Musiqi Alətləri', v_user_id, false);
    END IF;

    -- Добавляем товары
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('3f1b4399-369d-4684-983e-7c04d246ffa8', v_category_id, 'Yamaha F310 Akustik Gitara', 350, v_user_id, '4957812547120', 245.00, 44, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('fc14a7b8-e66d-4438-aba6-111a7ff321b6', v_category_id, 'AG-158', 6400, v_user_id, '7656431614976', 4480.00, 34, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('68f990c6-9ad2-4e2c-9430-1ad8a1aa4a60', v_category_id, ',,,,,,,,AG-158,,in_stock,new,,,,', 0, v_user_id, '5187259185692', 0.00, 46, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('988bff8d-0058-47f1-a3f6-043f10fbe52d', v_category_id, 'AG-880 S', 2200, v_user_id, '9501242563926', 1540.00, 17, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('52b3b8c0-5061-40db-ae45-17bd1f9ca664', v_category_id, 'AG-8810 B', 1550, v_user_id, '5894700143440', 1085.00, 24, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('23488b64-e088-4da8-829f-00864a0ab08d', v_category_id, 'AG-8818', 1150, v_user_id, '2137782089087', 805.00, 13, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('2bce308a-d7d7-4222-acb7-43cb54241d77', v_category_id, 'AG-8817', 850, v_user_id, '1272629423413', 595.00, 18, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('fda89cdc-a0cb-4822-b584-aaf6c95de0ac', v_category_id, 'AG-8817', 900, v_user_id, '4820290823285', 630.00, 23, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('1073fc53-3b3b-42cb-b670-1085aabacf5d', v_category_id, 'AG-F8820 C', 850, v_user_id, '9668580887201', 595.00, 10, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('950663ff-7dea-4c88-90e7-209d955219f0', v_category_id, 'AG-8825 C', 900, v_user_id, '2110373332778', 630.00, 39, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('e39e6c3f-0daa-42c5-9dbb-ac9c0dcfd296', v_category_id, 'AG-F100', 1200, v_user_id, '3063518768821', 840.00, 44, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('295a18cb-89ac-4240-acbf-4247320be51b', v_category_id, 'AG-100', 899, v_user_id, '6353545931818', 629.30, 7, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('fe644077-a740-4969-b365-b0882f4cb2c9', v_category_id, 'AG-8821', 600, v_user_id, '6492818639837', 420.00, 39, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('b50fc5df-90cd-4e9c-a636-f7c933882404', v_category_id, 'AG-8821', 850, v_user_id, '6726695957854', 595.00, 25, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('6037480d-631a-4aa7-9c54-73d362bb88fa', v_category_id, 'AG-8822 A', 800, v_user_id, '2608064749852', 560.00, 20, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('bc71ac09-32c3-42b0-9b8b-eadb578db388', v_category_id, 'AG-F8813', 1050, v_user_id, '5274659048588', 735.00, 17, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('4f9c2edd-14d0-42d1-b40a-e309385e48ad', v_category_id, 'AG-8813', 950, v_user_id, '1830501147923', 665.00, 28, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('45a23a28-374a-4a96-abd4-2a83ae63e87c', v_category_id, 'AG-58830', 1800, v_user_id, '5247270388132', 1260.00, 20, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('c95e2873-37bd-44b3-85ba-6eeef8c2aa98', v_category_id, 'AG-F8813L-4S', 700, v_user_id, '4354597460250', 490.00, 36, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('2732c2e7-cc1b-4a75-b166-e12e8bb95324', v_category_id, 'AG-8812', 650, v_user_id, '5053299025374', 455.00, 7, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('f112c6c3-581c-4b6e-909b-283cbe0a685d', v_category_id, 'AG-8812', 950, v_user_id, '9376618765579', 665.00, 24, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('5da17aee-2a30-4d71-99fc-5f5599c5fdf8', v_category_id, 'AG-8819', 950, v_user_id, '8416004644871', 665.00, 14, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('35e1f30a-8c9b-4630-a46b-c8828ee9bb06', v_category_id, 'AG-880', 1750, v_user_id, '1579116756902', 1225.00, 25, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('ed11488d-a803-4915-91f2-b49dc34d2a04', v_category_id, 'AG-130L-4S', 530, v_user_id, '6634032352911', 371.00, 22, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('15d18c99-c666-4faf-b6ad-2690d605d556', v_category_id, 'AG-190', 750, v_user_id, '9628485316401', 525.00, 26, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('5b50199a-ad7f-43cb-a207-1cb1dd0f60f0', v_category_id, 'AG-290-XB', 400, v_user_id, '4044763052432', 280.00, 32, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('2aed3b84-3398-4fa8-9f39-4883dc5d35a3', v_category_id, 'AG-F130', 500, v_user_id, '7072724440410', 350.00, 35, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('58588f3c-d9be-4622-a03a-cc56babb18da', v_category_id, 'AG-130', 580, v_user_id, '9863491639815', 406.00, 29, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('9db60699-a45e-415e-8615-4ca7b93dab2a', v_category_id, 'KFB-5189', 850, v_user_id, '5857477293447', 595.00, 41, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('da524361-7d98-41ef-b920-0cc27a4141e2', v_category_id, 'KFB-502', 450, v_user_id, '7095874598054', 315.00, 18, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('1a48679d-3d53-43d5-972b-b22888b933f7', v_category_id, 'KFB-R501', 250, v_user_id, '6743439138739', 175.00, 33, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('c7c4bf66-d1a1-447a-a4f7-bb3265a764b9', v_category_id, 'KFB-588', 550, v_user_id, '8429182328942', 385.00, 29, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('e1b11ed6-706a-4c9e-9539-a71876d1259c', v_category_id, 'KFB-X501', 420, v_user_id, '8540494794549', 294.00, 5, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('668757d1-539c-460e-a6c1-332da273a942', v_category_id, 'KFB-516', 350, v_user_id, '3723397784766', 245.00, 7, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('2adf8d82-8a9d-423e-9f6b-29c258559411', v_category_id, 'KFB-0161', 120, v_user_id, '4379331380884', 84.00, 47, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('4fe20184-10d0-4d83-b23a-e6e42aa95591', v_category_id, 'KFB-A88', 180, v_user_id, '6949866102670', 126.00, 6, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('af5e750d-2daa-484e-84ba-ba4f723b6104', v_category_id, 'KFB-520', 350, v_user_id, '8647541670433', 245.00, 24, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('c2422600-21f7-45c7-a2d5-9b1d3d43a59a', v_category_id, 'AG-8801', 1350, v_user_id, '3729910471413', 945.00, 38, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('5ac42ac2-87c0-4818-a75e-d4fa1fb289c8', v_category_id, 'AG-8807', 1250, v_user_id, '1029507483580', 875.00, 27, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('d6336412-4719-43e4-8868-4967dda07930', v_category_id, 'AG-8808', 1100, v_user_id, '1956222966172', 770.00, 36, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('2afab9e4-617a-4c42-b358-6d808698d583', v_category_id, 'AG-290-1', 599, v_user_id, '2959056081870', 419.30, 7, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('4ac9759f-f60c-4f9e-9b13-db3cbf0ccb61', v_category_id, 'ALLEGRO BENCH BAZALI', 95, v_user_id, '1235664500298', 66.50, 26, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('579d8201-5a36-488d-8787-b46bf3717a1a', v_category_id, 'K-105', 95, v_user_id, '2361812612338', 66.50, 44, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('8891ccc0-2e0e-4eff-8ccc-3c9aadd3dd01', v_category_id, 'X BENCH', 65, v_user_id, '9868691951211', 45.50, 5, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('ce1d18af-22ae-470e-90c1-9a1c1e2dc0eb', v_category_id, 'Q-15 BENCH', 270, v_user_id, '2195721131732', 189.00, 24, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('4024fc1e-6052-4a84-aebb-4ce08ca6efb8', v_category_id, 'Q-90', 90, v_user_id, '6793475893384', 63.00, 19, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('5bede235-76c4-437b-adfb-bf0d0cd591e5', v_category_id, 'PEDAL', 40, v_user_id, '4195219762370', 28.00, 28, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('d1a17b12-6365-4178-8f6c-41f69055ac4f', v_category_id, 'PEDAL', 50, v_user_id, '2348451584302', 35.00, 23, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('e3c0bd52-fc9a-4f92-9a27-9c172388f93e', v_category_id, 'PEDAL', 65, v_user_id, '3311139346965', 45.50, 18, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('08d20723-5a5d-4b52-aa28-8f15f11a07fc', v_category_id, 'TƏK PEDAL', 13, v_user_id, '8902855188464', 9.10, 19, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('c9de865e-d337-40c2-93ad-9f708a819e65', v_category_id, 'TƏK PEDAL', 13, v_user_id, '5295256038269', 9.10, 50, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('57eb675c-f0da-4d50-ae25-b77f480502df', v_category_id, 'QULAQCIQ', 10, v_user_id, '1371215099951', 7.00, 47, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('3c25f0a2-c11f-4ed7-9280-ffaaf0f30c61', v_category_id, 'USTAND', 80, v_user_id, '3794320695108', 56.00, 15, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('84dff898-2c06-4610-9bb6-7aaefaa3c6a2', v_category_id, 'PİANO COVER', 10, v_user_id, '7357336144034', 7.00, 14, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('2ae97dd0-9321-498e-bc35-c52af42258c2', v_category_id, 'PIANO ADAPTERI', 30, v_user_id, '7729452391578', 21.00, 32, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('2576672a-a880-4f99-b8ba-8ebaea9c183f', v_category_id, 'POWERBANK', 75, v_user_id, '4464406902520', 52.50, 42, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('401a467f-3dd9-4e5f-b656-bc33a8330d3f', v_category_id, 'PİANO ÇANTASI 5188', 25, v_user_id, '7741545760439', 17.50, 40, 5, 'finished_good', false, false);
    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('36375c0c-23c2-4ec3-916c-120fb3bc333d', v_category_id, 'PİANO ÇANTASI AG-130 BÖYÜK', 30, v_user_id, '2198035854026', 21.00, 17, 5, 'finished_good', false, false);

END $$;
