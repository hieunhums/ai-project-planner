"""
API route definitions for AI Planning Assistant
"""

from fastapi import APIRouter

# Create main API router
api_router = APIRouter(prefix="/api")

# Health check endpoint
health_router = APIRouter(prefix="/health", tags=["health"])


@health_router.get("")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "database": "not_configured",  # Will update in later phases
        "ai_service": "not_configured",  # Will update in later phases
    }


# Include health router in main API router
api_router.include_router(health_router)

# Placeholder routers for future phases
# planning_router = APIRouter(prefix="/plans", tags=["planning"])
# api_router.include_router(planning_router)
