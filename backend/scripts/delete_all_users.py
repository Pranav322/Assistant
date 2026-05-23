import asyncio
import logging
import os
import sys

# Ensure the project root is in sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

print(f"DEBUG: Project Root: {PROJECT_ROOT}")
print(f"DEBUG: CWD: {os.getcwd()}")
print(f"DEBUG: sys.path: {sys.path}")

from firebase_admin import auth
from sqlalchemy import select

from app.api.deps import AsyncSessionLocal
from app.core.firebase import initialize_firebase
from app.models import Project, RetrievalMetric, Source, User
from app.services.storage import StorageService

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def delete_all_data():
    confirmation = input(
        "⚠️  WARNING: This will DELETE ALL USERS and their data from Postgres, S3, and Firebase.\nAre you sure? (type 'yes' to confirm): "
    )
    if confirmation != "yes":
        print("Aborted.")
        return

    # 1. Initialize Firebase
    try:
        initialize_firebase()
    except Exception:
        pass

    async with AsyncSessionLocal() as db:
        # 2. Get all users from Postgres
        logger.info("Fetching all users from Postgres...")
        result = await db.execute(select(User))
        users = result.scalars().all()

        logger.info(f"Found {len(users)} users in Postgres.")

        storage = StorageService()

        for user in users:
            logger.info(f"Processing User: {user.email} ({user.id})")

            # A. Cleanup Storage
            result = await db.execute(
                select(Source).join(Project).where(Project.owner_id == user.id)
            )
            sources = result.scalars().all()
            for source in sources:
                if source.storage_location:
                    try:
                        await storage.delete_file(source.storage_location)
                    except Exception as e:
                        logger.error(
                            f"Failed to delete file {source.storage_location}: {e}"
                        )

            # B. Cleanup Retrieval Metrics (Missing Cascade)
            # Find all projects for this user
            projects_result = await db.execute(
                select(Project.id).where(Project.owner_id == user.id)
            )
            project_ids = projects_result.scalars().all()

            if project_ids:
                from sqlalchemy import delete

                await db.execute(
                    delete(RetrievalMetric).where(
                        RetrievalMetric.project_id.in_(project_ids)
                    )
                )
                logger.info(
                    f"Deleted retrieval metrics for {len(project_ids)} projects."
                )

            # C. Delete from Postgres
            await db.delete(user)

            # D. Delete from Firebase (if email exists)
            try:
                user_record = auth.get_user_by_email(user.email)
                auth.delete_user(user_record.uid)
                logger.info(f"Deleted Firebase user: {user.email}")
            except auth.UserNotFoundError:
                logger.warning(f"Firebase user {user.email} not found.")
            except Exception as e:
                logger.error(f"Error checking Firebase for {user.email}: {e}")

        await db.commit()
        logger.info("All Postgres users deleted.")

    # 3. Cleanup Orphaned Firebase Users
    # (Users that exist in Firebase but were not in Postgres)
    logger.info("Checking for orphaned Firebase users...")
    page = auth.list_users()
    while page:
        for user in page.users:
            logger.info(f"Deleting orphaned Firebase user: {user.email} ({user.uid})")
            try:
                auth.delete_user(user.uid)
            except Exception as e:
                logger.error(f"Failed to delete {user.uid}: {e}")

        # Get next page
        page = page.get_next_page()

    logger.info("🎉 System Wipe Complete.")


if __name__ == "__main__":
    asyncio.run(delete_all_data())
