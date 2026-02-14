
import asyncio
import time
import uuid
import hashlib
import bcrypt

# Mocking the verification function as it is in the codebase
def verify_api_key(provided_key: str, stored_hash: str) -> bool:
    return bcrypt.checkpw(provided_key.encode(), stored_hash.encode())

def hash_api_key(api_key: str) -> str:
    hashed = bcrypt.hashpw(api_key.encode(), bcrypt.gensalt(rounds=12))
    return hashed.decode("utf-8")

def get_api_key_fast_hash(api_key: str) -> str:
    return hashlib.sha256(api_key.encode()).hexdigest()

class MockKey:
    def __init__(self, key_hash, fast_hash=None):
        self.key_hash = key_hash
        self.fast_hash = fast_hash
        self.expires_at = None

async def reproduce():
    print("Generating 50 LEGACY mock API keys (no fast_hash)...")
    keys = []
    plain_keys = []
    
    # Simulate 50 LEGACY keys in the DB for a project
    for i in range(50):
        key_value = f"chat_{uuid.uuid4()}"
        plain_keys.append(key_value)
        key_hash = hash_api_key(key_value)
        # fast_hash is None for legacy keys
        keys.append(MockKey(key_hash=key_hash, fast_hash=None))
    
    print(f"Generated {len(keys)} legacy keys.")
    
    # Pick a valid key to test lazy backfill
    target_key = plain_keys[25] # middle key
    target_key_obj = keys[25]
    
    print(f"Testing lazy backfill for key: {target_key[:12]}...")
    
    # Simulate the lookup in _find_api_key (Legacy Path)
    found_key = None
    
    # 1. Fast lookup (finds nothing because fast_hash is None)
    fast_hash_input = get_api_key_fast_hash(target_key)
    matching_fast = [k for k in keys if k.fast_hash == fast_hash_input]
    if not matching_fast:
        print("Fast path: No match found (Expected for legacy key)")
    
    # 2. Fallback loop
    print("Fallback path: Iterating...")
    start_time = time.time()
    
    # Simulate DB query for keys with fast_hash is NULL
    legacy_candidates = [k for k in keys if k.fast_hash is None]
    
    for k in legacy_candidates:
        if verify_api_key(target_key, k.key_hash):
            found_key = k
            # MIGRATE!
            print("Match found! Migrating key...")
            k.fast_hash = fast_hash_input
            # (In real app, we would db.commit())
            break
            
    end_time = time.time()
    print(f"Time taken for legacy verification: {end_time - start_time:.4f} seconds")
    
    if found_key and found_key.fast_hash:
        print("SUCCESS: Key was backfilled with fast_hash.")
    else:
        print("FAILURE: Key was NOT backfilled.")

    # 3. Verify subsequent request is fast
    print("Verifying subsequent request (Fast Path)...")
    start_time_2 = time.time()
    matching_fast_2 = [k for k in keys if k.fast_hash == fast_hash_input]
    
    found_key_2 = None
    for k in matching_fast_2:
        if verify_api_key(target_key, k.key_hash):
            found_key_2 = k
            break
            
    end_time_2 = time.time()
    print(f"Time taken for migrated verification: {end_time_2 - start_time_2:.6f} seconds")
    
    if found_key_2:
        print("SUCCESS: Key found via fast path!")
    else:
        print("FAILURE: Key NOT found via fast path.")

if __name__ == "__main__":
    asyncio.run(reproduce())
