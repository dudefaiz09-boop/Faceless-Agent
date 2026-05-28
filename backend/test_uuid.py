import asyncio, uuid, sys
sys.path.append('.')
from app.database import async_session_factory, engine, Base
from sqlalchemy import select
from app.models.niche import Niche, NichePipelineStatus

async def test():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with async_session_factory() as db:
        # Query all niches
        result = await db.execute(select(Niche))
        niches = result.scalars().all()
        print(f"Found {len(niches)} niches")
        for n in niches:
            print(f"  Niche: {n.id} | {n.name} | pipeline: {n.pipeline_status}")
        
        if niches:
            n = niches[0]
            # Try to query by ID
            print(f"\nTrying to query with id={n.id} (type={type(n.id)})")
            result2 = await db.execute(select(Niche).where(Niche.id == n.id))
            n2 = result2.scalar_one_or_none()
            if n2:
                print(f"  Found: {n2.name}")
            else:
                print(f"  NOT FOUND!")
            
            # Try with string
            print(f"\nTrying to query with string id={str(n.id)}")
            try:
                result3 = await db.execute(select(Niche).where(Niche.id == uuid.UUID(str(n.id))))
                n3 = result3.scalar_one_or_none()
                if n3:
                    print(f"  Found: {n3.name}")
                else:
                    print(f"  NOT FOUND!")
            except Exception as e:
                print(f"  Error: {e}")

asyncio.run(test())
