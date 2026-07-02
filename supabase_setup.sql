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
