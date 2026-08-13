from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.auth.router import router as auth_router
from app.backtesting.router import router as backtesting_router
from app.analytics.router import router as analytics_router
from app.assistant.router import router as assistant_router
from app.products.router import router as products_router

app = FastAPI(
    title="Enterprise Intelligence Platform API",
    description="Modular Monolith API containing Backtesting, DataMart Analytics, and Retail AI Assistant",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(backtesting_router, prefix="/api/backtesting", tags=["Backtesting"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(assistant_router, prefix="/api/assistant", tags=["AI Assistant"])
app.include_router(products_router, prefix="/api/products", tags=["Products"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Enterprise Intelligence Platform API"}
