import secrets
import string

def generate_secret_key(length=50):
    """Generate a secure random secret key"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

if __name__ == "__main__":
    key = generate_secret_key()
    print(f"Generated Secret Key: {key}")
    
    # Save to file for reference
    with open('secret_key.txt', 'w') as f:
        f.write(key)
    print("Secret key saved to secret_key.txt")