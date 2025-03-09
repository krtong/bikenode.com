CREATE TABLE IF NOT EXISTS motorcycles (
    id UUID PRIMARY KEY,
    year INTEGER NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    package TEXT,
    category TEXT,
    engine TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);
