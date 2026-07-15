-- Drop existing tables to ensure clean recreate with 768 dimensions
drop table if exists corpus cascade;

-- Enable the pgvector extension to work with embeddings
create extension if not exists vector;

-- Create the corpus table to store saint passages
create table corpus (
  id uuid default gen_random_uuid() primary key,
  doctor text not null,           -- 'sales' | 'augustine' | 'therese'
  work text not null,             -- e.g. 'Introduction to the Devout Life'
  chapter text,                   -- optional
  content text not null,          -- the passage text
  embedding vector(768),          -- Google gemini-embedding-001 dimension
  created_at timestamp with time zone default now()
);

-- Disable Row Level Security (RLS) since corpus passages are public read/write for this app
alter table corpus disable row level security;

-- Index for fast similarity search using IVFFlat index.
create index corpus_embedding_idx on corpus using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Create a database function (RPC) to search the corpus
create or replace function match_corpus (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_doctor text default 'all'
)
returns table (
  id uuid,
  doctor text,
  work text,
  chapter text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    corpus.id,
    corpus.doctor,
    corpus.work,
    corpus.chapter,
    corpus.content,
    1 - (corpus.embedding <=> query_embedding) as similarity
  from corpus
  where (filter_doctor = 'all' or corpus.doctor = filter_doctor)
    and 1 - (corpus.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;


-- =========================================================================
-- === PRIVATE CHATS UPDATE (GOOGLE AUTH & RLS) ===
-- =========================================================================

-- 1. Add user_id column referencing auth.users(id) to sessions
alter table sessions 
add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

-- 2. Enable Row-Level Security (RLS) on both sessions and messages tables
alter table sessions enable row level security;
alter table messages enable row level security;

-- 3. Create RLS Policy for Sessions
create policy "Users can manage their own sessions" 
on sessions for all 
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 4. Create RLS Policy for Messages
create policy "Users can manage messages in their own sessions"
on messages for all
to authenticated
using (
  session_id in (
    select id from sessions where user_id = auth.uid()
  )
)
with check (
  session_id in (
    select id from sessions where user_id = auth.uid()
  )
);

-- =========================================================================
-- === INSIGHTS TABLE UPDATE ===
-- =========================================================================

-- 1. Create insights table
create table if not exists insights (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  session_id uuid references sessions(id) on delete cascade,
  doctor text not null,
  content text not null, -- full decrypted text
  created_at timestamp with time zone default now()
);

-- 2. Enable Row-Level Security (RLS) on insights table
alter table insights enable row level security;

-- 3. Create RLS Policy for Insights
create policy "Users can manage their own insights" 
on insights for all 
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 4. Add summary column to sessions table
alter table sessions add column if not exists summary text;

-- =========================================================================
-- === SPIRITUAL PROFILE TABLE (IN-MEMORY PAST-CONVERSATION RECALL) ===
-- =========================================================================

-- 1. Create spiritual_profiles table (one row per user)
create table if not exists spiritual_profiles (
  user_id uuid references auth.users(id) on delete cascade default auth.uid() primary key,
  profile text, -- AES-256 encrypted
  updated_at timestamp with time zone default now()
);

-- 2. Enable Row-Level Security (RLS) on spiritual_profiles table
alter table spiritual_profiles enable row level security;

-- 3. Create RLS Policy for spiritual_profiles
create policy "Users can manage their own spiritual profile"
on spiritual_profiles for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
