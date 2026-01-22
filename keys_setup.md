# API Key Setup Guide for AgentScore

To run AgentScore locally, you need keys for **Google Gemini** (for the AI analysis) and **Supabase** (for the database).

## 1. Google Gemini API Key

This key is used by both the backend (for analysis) and the agent demos (to simulate AI calls).

1.  Go to the [Google AI Studio](https://aistudio.google.com/).
2.  Sign in with your Google account.
3.  Click on the **"Get API key"** button in the sidebar.
4.  Click **"Create API key in new project"** (or select an existing one).
5.  Copy your API key.

## 2. Supabase Credentials

Supabase provides the database for storing workflows, events, and analyses.

1.  Go to [Supabase](https://supabase.com/) and sign in.
2.  Click **"New Project"** and select an organization.
3.  Give your project a name (e.g., `AgentScore-Local`) and set a database password.
4.  Once the project is initialized (this may take a minute):
    -   Go to **Project Settings** (gear icon) > **API**.
    -   Find your **Project URL** (under "Project URL"). This is your `SUPABASE_URL`.
    -   Find your **anon public API key** (under "Project API keys"). This is your `SUPABASE_KEY`.

> [!IMPORTANT]
> You also need to initialize the database schema. Run the SQL provided in `backend/schema.sql` in the Supabase SQL Editor.

## 3. Configuration

You need to create/update two `.env` files:

### Backend Configuration
Create file: `backend/.env`
```bash
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### SDK/Agent Configuration
Create file: `sdk/kaizen/.env`
```bash
GEMINI_API_KEY=your_gemini_api_key_here
# The demo agent uses this variable name
GEMINI_AGENT_KEY=your_gemini_api_key_here
KAIZEN_BACKEND_URL=http://localhost:8000
```

## 4. Verification

Once you've added the keys, you can verify everything is working by running:

1.  **Verify Gemini (from root):**
    ```bash
    python3 backend/list_models.py
    ```
2.  **Verify Supabase (from root):**
    ```bash
    python3 backend/test_connection.py
    ```
