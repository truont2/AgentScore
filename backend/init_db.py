import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")

def init_db():
    if not DB_URL:
        print("ERROR: DATABASE_URL not found in .env file.")
        print("Please add the direct PostgreSQL connection string (Transaction Mode) to your .env file:")
        print("DATABASE_URL=postgres://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres")
        return

    print("Connecting to database...")
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()

        print("Dropping existing tables (CASCADE)...")
        cur.execute("""
            DROP TABLE IF EXISTS analyses CASCADE;
            DROP TABLE IF EXISTS events CASCADE;
            DROP TABLE IF EXISTS workflows CASCADE;
        """)

        print("Creating 'workflows' table...")
        cur.execute("""
            CREATE TABLE workflows (
                id UUID PRIMARY KEY,
                name TEXT,
                status TEXT,
                total_cost FLOAT DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)

        print("Creating 'events' table...")
        cur.execute("""
            CREATE TABLE events (
                run_id UUID PRIMARY KEY,
                workflow_id UUID REFERENCES workflows(id),
                parent_run_id UUID,
                event_type TEXT,
                model TEXT,
                prompt JSONB,
                response JSONB,
                tokens_in INTEGER,
                tokens_out INTEGER,
                cost FLOAT,
                latency_ms INTEGER,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)

        print("Creating 'analyses' table...")
        # using gen_random_uuid() requires 'pgcrypto' extension, but usually installed or can use uuid_generate_v4()
        # Fallback to loading utility first just in case
        cur.execute("CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";")
        
        cur.execute("""
            CREATE TABLE analyses (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                workflow_id UUID REFERENCES workflows(id),
                original_cost FLOAT,
                optimized_cost FLOAT,
                redundancies JSONB,
                model_overkill JSONB,
                prompt_bloat JSONB,
                efficiency_score INTEGER,
                efficiency_grade TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)

        conn.commit()
        cur.close()
        conn.close()
        print("Success! Database initialized with proper schema.")

    except Exception as e:
        print(f"Database initialization failed: {e}")

if __name__ == "__main__":
    confirm = input("This will DROP ALL DATA. Type 'yes' to proceed: ")
    if confirm == "yes":
        init_db()
    else:
        print("Aborted.")
