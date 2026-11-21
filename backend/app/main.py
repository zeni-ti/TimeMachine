from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import Base, engine
from app.routers import ai, alarms, challenges, timezones

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Time Machine API",
    description="Backend for the hostile timezone-hijacking alarm clock.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(alarms.router)
app.include_router(challenges.router)
app.include_router(timezones.router)
app.include_router(ai.router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "All times are local. Sleep well."}