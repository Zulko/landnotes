import os
import shutil
from pathlib import Path
from sqlalchemy import (
    Table,
    Column,
    String,
    Integer,
    Float,
    Boolean,
    MetaData,
    text,
    create_engine,
)
import pandas

import fastavro
import sqlite3
from tqdm.auto import tqdm
import lmdb


def sqlite_to_pandas(db_path, table_name):
    engine = create_engine(f"sqlite:///{db_path}")
    return pandas.read_sql_table(table_name, engine)


class LMDBReader:
    def __init__(self, db_path):
        self.db_path = db_path
        self.db = None

    def __enter__(self):
        self.db = lmdb.open(str(self.db_path), create=False, readonly=True)
        return self

    def get_from_keys(self, keys):
        with self.db.begin() as txn:
            return [txn.get(key.encode()) for key in keys]

    def get(self, key):
        with self.db.begin() as txn:
            return txn.get(key)

    def __iter__(self):
        with self.db.begin() as txn:
            for key, value in txn.cursor():
                yield key.decode(), value

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.db is not None:
            self.db.close()


class LMDBWriter(LMDBReader):
    def __init__(self, db_path, map_size=30_000_000_000):
        self.db_path = db_path
        self.db = None
        self.map_size = map_size

    def __enter__(self):
        self.db = lmdb.open(str(self.db_path), create=True, map_size=self.map_size)
        return self

    def write_batch(self, records):
        """Writes a list of (key, value) pairs to the database. Keys and values are bytes."""
        with self.db.begin(write=True) as txn:
            for key, value in records:
                txn.put(key, value)

    def write_record(self, key, value):
        """Writes a single (key, value) pair to the database. Keys and values are bytes."""
        with self.db.begin(write=True) as txn:
            txn.put(key.encode(), value)

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.db is not None:
            self.db.close()


def open_sqlite_db(db_path, replace=False):
    if replace and os.path.exists(db_path):
        os.remove(db_path)
    if not os.path.exists(db_path):
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
    return create_engine(f"sqlite:///{db_path}")


def iterate_over_sqlite_table(db_path, table_name):
    db = create_engine(f"sqlite:///{db_path}")
    with db.begin() as conn:
        for record in conn.execute(text(f"SELECT * FROM {table_name}")):
            yield record._asdict()


def avro_file(path, replace=False):
    path = Path(path)
    if replace and path.exists():
        path.unlink()
    return path.open("a+b")


def create_table_from_record(table_name, record, metadata=None):
    """
    Create a SQLAlchemy Table object from a sample record.

    Args:
        table_name: Name of the table to create
        record: A sample record (dict) to infer column types from
        metadata: Optional SQLAlchemy MetaData object (creates new one if None)

    Returns:
        A SQLAlchemy Table object with appropriate column definitions
    """
    if metadata is None:
        metadata = MetaData()

    columns = []
    for key, value in record.items():
        # Infer column type from value
        if isinstance(value, str):
            col_type = String(100)
        elif isinstance(value, int):
            col_type = Integer()
        elif isinstance(value, float):
            col_type = Float()
        elif isinstance(value, bool):
            col_type = Boolean()
        else:
            col_type = String(100)  # Default to string for other types
        columns.append(Column(key, col_type))

    return Table(table_name, metadata, *columns)


class SqliteTableBatchWriter:
    def __init__(
        self,
        db,
        table,
        index_key=None,
        text_indexed_fields=None,
        batch_size=10_000,
        unloading_threshold=None,
        unloading_dir=None,
        online_filedir=None,
    ):
        self.db = db
        self.table = table
        self.index_key = index_key
        self.text_indexed_fields = text_indexed_fields
        self.batch_size = batch_size
        self.current_records = []
        self.unloading_threshold = unloading_threshold
        self.online_filedir = online_filedir
        if unloading_dir is not None:
            self.unloading_dir = Path(unloading_dir)
            self.unloading_dir.mkdir(parents=True, exist_ok=True)
        else:
            self.unloading_dir = None

    def add_record_to_db_table(self, record):
        if self.unloading_threshold is not None:
            unloaded_record = self.unload_large_values(record)
            self.current_records.append(unloaded_record)
        else:
            self.current_records.append(record)
        if len(self.current_records) > self.batch_size:
            self.insert_records()

    def unload_large_values(self, record):
        record = record.copy()
        record_id = record[self.index_key]
        for key, value in record.items():
            if (
                isinstance(value, (str, bytes))
                and len(str(value)) > self.unloading_threshold
            ):
                filename = f"{record_id}_{key}.dat"
                target = self.unloading_dir / filename
                if isinstance(value, bytes):
                    target.write_bytes(value)
                else:
                    target.write_text(value)
                file_url = f"file:{self.online_filedir}/{filename}"
                if isinstance(value, bytes):
                    file_url = file_url.encode()
                record[key] = file_url
        return record

    def execute(self, command, *args):
        if isinstance(command, str):
            command = text(command)
        with self.db.begin() as conn:
            return conn.execute(command, *args)

    def insert_records(self):
        if len(self.current_records) == 0:
            return
        table = create_table_from_record(self.table, self.current_records[0])
        self.execute(table.insert(), self.current_records)
        self.current_records = []

    def index(self):
        command = f"CREATE INDEX IF NOT EXISTS idx_{self.table} ON {self.table} ({self.index_key})"
        self.execute(command)

    def index_text(self):
        self.execute(
            f"""
            CREATE VIRTUAL TABLE text_search USING fts5(
                {", ".join(self.text_indexed_fields)},
                content='{self.table}',
                content_rowid='rowid',
                prefix=4
            );
            """,
        )

        self.execute(
            f"""
            INSERT INTO text_search(rowid, {", ".join(self.text_indexed_fields)})
            SELECT rowid, {", ".join(self.text_indexed_fields)} FROM {self.table};
            """,
        )


# def add_record_to_db_table(db, table_name, record, current_batches, batch_size=10_000):
#     if table_name not in current_batches:
#         current_batches[table_name] = []
#     records = current_batches[table_name]
#     records.append(record)
#     if len(records) > batch_size:
#         insert_records_to_db_table(db, table_name, records)
#         current_batches[table_name] = []


def db_execute(db, commands):
    if isinstance(commands, str):
        commands = [commands]
    with db.begin() as conn:
        for command in commands:
            result = conn.execute(text(command))
    return result


def avro_to_pandas(avro_file):
    with open(avro_file, "rb") as f:
        records = fastavro.reader(f)
        return pandas.DataFrame(records)


def format_value(v):
    if str(v) in ["None", "nan"]:
        return "null"
    if isinstance(v, str):
        escaped = v.replace("'", "''")
        return f"'{escaped}'"
    if isinstance(v, bytes):
        # Convert bytes to a hex string representation
        hex_str = v.hex()
        return f"X'{hex_str}'"
    # float etc.
    return str(v)


def row_to_sql_value_tuple(row):
    return "(" + ",".join([format_value(v) for v in row]) + ")"


def df_to_insert_statement(df, table, columns):
    # Construct a single INSERT statement with multiple value tuples
    # Group value tuples into batches that don't exceed 90,000 characters
    value_tuples = []
    current_batch = []
    current_batch_size = 0

    for row in df[columns].values.tolist():
        tuple_str = row_to_sql_value_tuple(row)
        tuple_size = len(tuple_str) + 2  # +2 for the comma and space

        # If adding this tuple would exceed the limit, start a new batch
        if current_batch_size + tuple_size > 90000 and current_batch:
            value_tuples.append(", ".join(current_batch))
            current_batch = [tuple_str]
            current_batch_size = tuple_size
        else:
            current_batch.append(tuple_str)
            current_batch_size += tuple_size

    # Add the last batch if it's not empty
    if current_batch:
        value_tuples.append(", ".join(current_batch))

    # Create multiple INSERT statements if needed
    if len(value_tuples) == 1:
        return f"INSERT INTO {table} ({', '.join(columns)}) VALUES {value_tuples[0]};"
    else:
        return "\n\n".join(
            [
                f"INSERT INTO {table} ({', '.join(columns)}) VALUES {batch};"
                for batch in value_tuples
            ]
        )


def export_sql_files(
    db_path: str,
    output_dir,
    batch_size_by_command: int = 6000,
    commands_per_file: int = 1,
    row_limit: int = None,
):
    """
    Reads the single user table in the SQLite database at db_path and writes:
      - create_table.sql   : the CREATE TABLE statement
      - inserts_1.sql, …    : INSERT statements in batches of batch_size rows
      - indexes.sql        : any CREATE INDEX statements on the table
      - text_search.sql    : commands to create and populate FTS5 text search table (if present)

    If output_dir is None, files are created in the current directory.
    Returns a list of the paths of the files written.
    """
    output_dir = Path(output_dir)
    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Get all tables
    cur.execute("SELECT name, sql FROM sqlite_master WHERE type='table'")
    all_tables = cur.fetchall()

    # Identify user tables (excluding sqlite_ tables and FTS5 shadow tables)
    user_tables = [
        table[0]
        for table in all_tables
        if not table[0].startswith("sqlite_")
        and not table[0].endswith(("_data", "_idx", "_content", "_docsize", "_config"))
    ]

    # Check for FTS5 virtual tables
    cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND sql LIKE '%USING fts5%'"
    )
    fts_tables = [row[0] for row in cur.fetchall()]

    # Remove FTS5 tables from user_tables
    for fts_table in fts_tables:
        if fts_table in user_tables:
            user_tables.remove(fts_table)

    if len(user_tables) != 1:
        raise ValueError(f"Expected exactly one user table, found: {user_tables}")

    table_name = user_tables[0]

    files = []

    # 2. Write CREATE TABLE
    create_path = os.path.join(output_dir, "create_table.sql")
    # Get the original CREATE TABLE statement with all constraints
    cur.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name=?", (table_name,)
    )
    create_sql = cur.fetchone()[0]
    with open(create_path, "w", encoding="utf-8") as f:
        f.write(f"{create_sql.rstrip().rstrip(';')};\n")
    files.append(create_path)

    # Get column names for INSERT statements
    cur.execute(f'PRAGMA table_info("{table_name}")')
    cols = [row[1] for row in cur.fetchall()]
    col_list = ", ".join(f'"{c}"' for c in cols)

    # 3. Prepare INSERTs
    #   stream rows in batches
    cur.execute(f'SELECT * FROM "{table_name}"')
    file_num = 0
    rows_processed = 0
    commands_in_current_file = 0
    insert_statements = []

    progress_bar = tqdm(total=row_limit, desc="Processing rows")

    while True:
        # Check if we've reached the row limit
        if row_limit is not None and rows_processed >= row_limit:
            break

        # Calculate how many rows to fetch in this batch
        fetch_size = batch_size_by_command
        if row_limit is not None:
            fetch_size = min(batch_size_by_command, row_limit - rows_processed)

        rows = cur.fetchmany(fetch_size)
        if not rows:
            break

        # Build one multi-row INSERT
        vals = []
        for row in rows:
            # escape NULLs and text
            vlist = []
            for v in row:
                if v is None:
                    vlist.append("NULL")
                elif isinstance(v, (int, float)):
                    vlist.append(str(v))
                elif isinstance(v, bytes):
                    # Convert bytes to hex format for SQLite
                    hex_str = v.hex()
                    vlist.append(f"X'{hex_str}'")
                else:
                    # escape single quotes
                    s = str(v).replace("'", "''")
                    vlist.append(f"'{s}'")
            vals.append(f"({', '.join(vlist)})")

        insert_statement = f'INSERT INTO "{table_name}" ({col_list}) VALUES\n'
        insert_statement += ",\n".join(vals)
        insert_statement += ";\n"

        insert_statements.append(insert_statement)
        commands_in_current_file += 1

        # Write to file if we've reached commands_per_file or no more rows
        if commands_in_current_file >= commands_per_file:
            file_num += 1
            insert_path = os.path.join(output_dir, f"inserts_{file_num:04d}.sql")
            with open(insert_path, "w", encoding="utf-8") as f:
                f.write("".join(insert_statements))
            files.append(insert_path)

            # Reset for next file
            insert_statements = []
            commands_in_current_file = 0

        rows_processed += len(rows)
        progress_bar.update(len(rows))

    # Write any remaining insert statements to a file
    if insert_statements:
        file_num += 1
        insert_path = os.path.join(output_dir, f"inserts_{file_num:04d}.sql")
        with open(insert_path, "w", encoding="utf-8") as f:
            f.write("".join(insert_statements))
        files.append(insert_path)

    # 4. Extract any CREATE INDEX statements
    cur.execute(
        """
        SELECT sql
          FROM sqlite_master
         WHERE type = 'index'
           AND tbl_name = ?
           AND sql IS NOT NULL
    """,
        (table_name,),
    )
    idx_statements = [row[0].rstrip().rstrip(";") + ";" for row in cur.fetchall()]

    if idx_statements:
        idx_path = os.path.join(output_dir, "generate_indexes.sql")
        with open(idx_path, "w", encoding="utf-8") as f:
            f.write("\n".join(idx_statements))
            f.write("\n")
        files.append(idx_path)

    # 5. Check for FTS5 text search tables
    cur.execute("""
        SELECT name, sql
        FROM sqlite_master
        WHERE type='table' 
        AND name='text_search'
        AND sql LIKE '%USING fts5%'
    """)
    fts_tables = cur.fetchall()

    if fts_tables:
        # There's a text search table - let's extract the fields
        for fts_name, fts_sql in fts_tables:
            # Extract table content and fields from the CREATE VIRTUAL TABLE statement
            import re

            content_match = re.search(r"content='([^']+)'", fts_sql)
            if content_match:
                content_table = content_match.group(1)

                # Extract fields from the FTS5 table
                cur.execute(f"PRAGMA table_info({fts_name})")
                text_fields = [row[1] for row in cur.fetchall() if row[1] != ""]

                # Create text_search.sql file
                text_search_path = os.path.join(output_dir, "text_search.sql")
                with open(text_search_path, "w", encoding="utf-8") as f:
                    fields_str = ", ".join(text_fields)
                    f.write(f"""CREATE VIRTUAL TABLE text_search USING fts5(
                        {fields_str},
                        content='{content_table}',
                        content_rowid='rowid',
                        prefix=4
                    );

                    INSERT INTO text_search(rowid, {fields_str})
                    SELECT rowid, {fields_str} FROM {content_table};
                    """)
                files.append(text_search_path)

    conn.close()
    return files
