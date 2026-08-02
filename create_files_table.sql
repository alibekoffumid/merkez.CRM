-- Создание таблицы для хранения метаданных файлов
CREATE TABLE IF NOT EXISTS warehouse_files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    size INTEGER NOT NULL,
    type TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Настройка политик безопасности RLS (Row Level Security)
ALTER TABLE warehouse_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own files" 
    ON warehouse_files FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files" 
    ON warehouse_files FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files" 
    ON warehouse_files FOR DELETE 
    USING (auth.uid() = user_id);
