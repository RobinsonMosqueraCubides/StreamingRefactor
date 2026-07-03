import os
import base64
import hashlib
from cryptography.fernet import Fernet

# Obtener o derivar clave de encriptación de 32 bytes compatible con Fernet
secret = os.getenv("ENCRYPTION_KEY") or os.getenv("JWT_SECRET", "super-secret-key-change-it-in-production-12345")
# Hashear la clave secreta con SHA256 para obtener 32 bytes exactos
key_bytes = hashlib.sha256(secret.encode('utf-8')).digest()
# Codificar en base64 urlsafe
fernet_key = base64.urlsafe_b64encode(key_bytes)
cipher_suite = Fernet(fernet_key)

def encrypt_password(plain_text: str) -> str:
    if not plain_text:
        return ""
    encrypted_bytes = cipher_suite.encrypt(plain_text.encode('utf-8'))
    return encrypted_bytes.decode('utf-8')

def decrypt_password(cipher_text: str) -> str:
    if not cipher_text:
        return ""
    try:
        decrypted_bytes = cipher_suite.decrypt(cipher_text.encode('utf-8'))
        return decrypted_bytes.decode('utf-8')
    except Exception:
        # Retornar original en caso de fallo (para datos antiguos de desarrollo)
        return cipher_text
