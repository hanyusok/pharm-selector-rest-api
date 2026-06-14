import sqlite3
import pandas as pd
import os

DB_PATH = 'pharmacy.db'
CSV_PATH = 'pharm_db.csv'

def init_db():
    print(f"Reading {CSV_PATH}...")
    df = pd.read_csv(CSV_PATH)
    
    # Rename columns for easier access
    df.rename(columns={
        '암호화요양기호': 'id',
        '요양기관명': 'name',
        '종별코드': 'type_code',
        '종별코드명': 'type_name',
        '시도코드': 'province_code',
        '시도코드명': 'province_name',
        '시군구코드': 'city_code',
        '시군구코드명': 'city_name',
        '읍면동': 'town',
        '우편번호': 'zip_code',
        '주소': 'address',
        '전화번호': 'phone',
        '개설일자': 'open_date',
        '좌표(X)': 'lon',
        '좌표(Y)': 'lat'
    }, inplace=True)
    
    # Add fax_number column initialized to None
    df['fax_number'] = None
    
    print("Connecting to SQLite database...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("Writing to database...")
    # Use to_sql to write the dataframe. We replace if it exists to allow re-running easily.
    df.to_sql('pharmacies', conn, if_exists='replace', index=False)
    
    # Create indexes for faster querying
    print("Creating indexes...")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_name ON pharmacies(name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_address ON pharmacies(address)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_lat_lon ON pharmacies(lat, lon)")
    
    conn.commit()
    conn.close()
    print("Database initialization complete.")

if __name__ == "__main__":
    init_db()
