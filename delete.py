import asyncio
import sys
import logging
from sqlalchemy import select
from firebase_admin import auth, initialize_app, credentials, _apps
from app.db.session import AsyncSessionLocal
from app.models import User, Project, Source
from app.core.config import settings
from app.core.firebase import initialize_firebase # Uses app's init logic
from app.services.storage import StorageService
# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
async def delete_user_by_email(email: str):
    async with AsyncSessionLocal() as db:
        # 1. Wait, need to check if user exists in DB first
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        sources_to_delete = []
        if not user:
            logger.warning(f"User {email} not found in Postgres.")
        else:
            logger.info(f"Found Postgres User: {user.id}")
            
            # 2. Cleanup Storage (S3/R2)
            # Find sources to get storage paths because DB cascade won't trigger S3 deletion.
            # We must query strictly BEFORE deleting the user.
            result = await db.execute(
                select(Source).join(Project).where(Project.owner_id == user.id)
            )
            sources = result.scalars().all()
            sources_to_delete = [s.storage_location for s in sources if s.storage_location]
            # 3. Delete from Postgres (Cascades to Projects, Chats, etc.)
            await db.delete(user)
            await db.commit()
            logger.info("Deleted user and data from Postgres.")
            # Now delete files (AFTER DB delete succeeds, or concurrently)
            # Actually better to delete files if DB delete succeeds, OR just log errors.
            if sources_to_delete:
                logger.info(f"Deleting {len(sources_to_delete)} files from storage...")
                storage = StorageService() # Ensure this is initialized with correct context if needed
                for path in sources_to_delete:
                    try:
                        await storage.delete_file(path)
                        logger.info(f"Deleted file: {path}")
                    except Exception as e:
                        logger.error(f"Failed to delete file {path}: {e}")
    # 4. Delete from Firebase
    try:
        # Ensure Firebase is initialized
        initialize_firebase()
    except Exception:
        pass 
    try:
        user_record = auth.get_user_by_email(email)
        auth.delete_user(user_record.uid)
        logger.info(f"Deleted Firebase user: {user_record.uid}")
    except auth.UserNotFoundError:
        logger.warning(f"User {email} not found in Firebase.")
    except Exception as e:
        logger.error(f"Error calling Firebase: {e}")
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/delete_user.py <email>")
        sys.exit(1)
        
    email_to_delete = sys.argv[1]
    asyncio.run(delete_user_by_email(email_to_delete))
