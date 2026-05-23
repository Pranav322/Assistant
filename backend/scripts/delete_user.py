import asyncio
import logging
import os
import sys

# Ensure the project root is in sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from firebase_admin import _apps, auth, credentials, initialize_app
from sqlalchemy import select

from app.api.deps import AsyncSessionLocal
from app.core.config import settings
from app.core.firebase import initialize_firebase
from app.models import Project, RetrievalMetric, Source, User
from app.services.storage import StorageService

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def delete_user_by_email(email: str):
    async with AsyncSessionLocal() as db:
        # 1. Check if user exists in DB first
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        sources_to_delete = []
        if not user:
            logger.warning(f"User {email} not found in Postgres.")
        else:
            logger.info(f"Found Postgres User: {user.id}")

            # 2. Cleanup Storage (S3/R2)
            # Find sources to get storage paths because DB cascade won't trigger S3 deletion.
            result = await db.execute(
                select(Source).join(Project).where(Project.owner_id == user.id)
            )
            sources = result.scalars().all()
            sources_to_delete = [
                s.storage_location for s in sources if s.storage_location
            ]

            # 3. Cleanup Retrieval Metrics (Missing Cascade)
            from sqlalchemy import delete

            projects_result = await db.execute(
                select(Project.id).where(Project.owner_id == user.id)
            )
            project_ids = projects_result.scalars().all()
            if project_ids:
                await db.execute(
                    delete(RetrievalMetric).where(
                        RetrievalMetric.project_id.in_(project_ids)
                    )
                )
                logger.info(
                    f"Deleted retrieval metrics for {len(project_ids)} projects."
                )

            # 4. Delete from Postgres (Cascades to Projects, Chats, etc.)
            await db.delete(user)
            await db.commit()
            logger.info("Deleted user and data from Postgres.")

            # Now delete files
            if sources_to_delete:
                logger.info(f"Deleting {len(sources_to_delete)} files from storage...")
                storage = StorageService()
                for path in sources_to_delete:
                    try:
                        await storage.delete_file(path)
                        logger.info(f"Deleted file: {path}")
                    except Exception as e:
                        logger.error(f"Failed to delete file {path}: {e}")

    # 4. Delete from Firebase
    try:
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
