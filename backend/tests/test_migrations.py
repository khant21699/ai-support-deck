import re
from pathlib import Path

from sqlmodel import SQLModel

from app import models  # noqa: F401  (registers the tables)

SQL_FOLDER = Path(__file__).parent.parent / "migrations"


def test_table_sql_matches_the_models():
    """If you change a model, run `make schema` to regenerate migrations/table.sql."""
    sql = (SQL_FOLDER / "table.sql").read_text()

    for table in SQLModel.metadata.tables.values():
        block = re.search(rf"CREATE TABLE IF NOT EXISTS {table.name} \((.*?)\n\);", sql, re.S)
        assert block, f"table.sql is missing the {table.name} table. Run `make schema`."
        for column in table.columns:
            assert re.search(rf"\b{column.name}\b", block.group(1)), (
                f"table.sql is missing {table.name}.{column.name}. Run `make schema`."
            )
        for index in table.indexes:
            assert index.name in sql, f"table.sql is missing the index {index.name}. Run `make schema`."


def test_seed_sql_only_uses_real_tables():
    sql = (SQL_FOLDER / "seed.sql").read_text()
    tables = set(SQLModel.metadata.tables)
    inserted = set(re.findall(r"INSERT INTO (\w+)", sql))
    assert inserted, "seed.sql should insert something"
    assert inserted <= tables, f"seed.sql inserts into unknown tables: {inserted - tables}"
