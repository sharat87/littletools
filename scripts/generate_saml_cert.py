#!/usr/bin/env python3
import base64
import datetime
import sys
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.x509.oid import NameOID


# Ref: <https://cryptography.io/en/latest/x509/tutorial/>.
def main():
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} privkey.pem cert.pem", file=sys.stderr)
        sys.exit(1)

    key_path = Path(sys.argv[1])
    cert_path = Path(sys.argv[2])

    key = serialization.load_pem_private_key(key_path.read_bytes(), password=None)

    subject = issuer = x509.Name(
        [
            x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "California"),
            x509.NameAttribute(NameOID.LOCALITY_NAME, "San Francisco"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "LittleTools"),
            x509.NameAttribute(NameOID.COMMON_NAME, "littletools.app"),
        ],
    )

    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.datetime.utcnow())
        .not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=90))
        .add_extension(
            x509.SubjectAlternativeName([x509.DNSName("littletools.app")]),
            critical=False,
        )
        # Sign our certificate with our private key
        .sign(key, hashes.SHA256())
    )

    cert_path.write_bytes(
        base64.b64encode(cert.public_bytes(serialization.Encoding.DER))
    )


if __name__ == "__main__":
    main()
