from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    LLM_API_KEY: str = ""
    
    class Config:
        env_file = ".env"
        extra = "ignore"

设定 = Settings()
settings = Settings()
