#!/usr/bin/env python3

import sys
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa


def main():
    if len(sys.argv) != 2:
        print("Usage: generate_rsa_key.py <privkey.pem>", file=sys.stderr)
        sys.exit(1)

    outfile = Path(sys.argv[1])

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    outfile.write_bytes(
        key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        ),
    )


if __name__ == "__main__":
    main()
