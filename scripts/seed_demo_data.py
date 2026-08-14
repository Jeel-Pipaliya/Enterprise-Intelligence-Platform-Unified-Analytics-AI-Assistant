import os
import pathlib
import random
from datetime import datetime, timedelta

import psycopg


ROOT = pathlib.Path(__file__).resolve().parents[1]


def load_env() -> None:
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def main() -> None:
    load_env()
    rng = random.Random(42)
    products = [
        ("Orbit Laptop Pro", "ELEC-001", "Electronics", 1499, 18, "Orbit"),
        ("Quantum Headphones", "ELEC-002", "Electronics", 249, 7, "Orbit"),
        ("Stride Runner", "FIT-001", "Fitness", 129, 34, "Stride"),
        ("Pulse Smartwatch", "FIT-002", "Fitness", 299, 5, "Pulse"),
        ("Nest Desk Lamp", "HOME-001", "Home", 79, 52, "Nest"),
        ("Aero Jacket", "FASH-001", "Fashion", 189, 12, "Aero"),
    ]

    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        existing_products = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        existing_transactions = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]

        if existing_products == 0:
            for name, sku, category, price, inventory, brand in products:
                conn.execute(
                    """
                    INSERT INTO products (name, sku, category, price, inventory_count, brand, description)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (sku) DO NOTHING
                    """,
                    (name, sku, category, price, inventory, brand, f"{brand} {category} product"),
                )

        if existing_transactions == 0:
            product_rows = conn.execute("SELECT id, price FROM products").fetchall()
            regions = ["North", "South", "East", "West"]
            methods = ["card", "upi", "wallet", "bank"]
            start = datetime.utcnow() - timedelta(days=180)
            for i in range(120):
                product_id, price = rng.choice(product_rows)
                quantity = rng.randint(1, 4)
                unit_price = float(price)
                date = start + timedelta(days=i * 1.5)
                conn.execute(
                    """
                    INSERT INTO transactions (
                        product_id, quantity, unit_price, total_amount,
                        region, transaction_date, payment_method, status
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 'completed')
                    """,
                    (
                        product_id,
                        quantity,
                        unit_price,
                        unit_price * quantity,
                        rng.choice(regions),
                        date,
                        rng.choice(methods),
                    ),
                )

        conn.commit()
        counts = conn.execute(
            """
            SELECT
                (SELECT COUNT(*) FROM users),
                (SELECT COUNT(*) FROM products),
                (SELECT COUNT(*) FROM transactions),
                (SELECT COUNT(*) FROM backtests),
                (SELECT COUNT(*) FROM chat_sessions)
            """
        ).fetchone()

    print(f"counts users={counts[0]} products={counts[1]} transactions={counts[2]} backtests={counts[3]} chats={counts[4]}")


if __name__ == "__main__":
    main()
