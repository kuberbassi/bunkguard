
import os
from pywebpush import WebPusher

# Generate keys
private_key = WebPusher.generate_private_key()
public_key = WebPusher.derive_public_key(private_key)

print(f"VAPID_PRIVATE_KEY={private_key}")
print(f"VAPID_PUBLIC_KEY={public_key}")
