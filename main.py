import sqlite3
import math
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query, Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
import math

from kakao_api import geocode_address

app = FastAPI(
    title="Pharmacy REST API",
    description="API for finding and managing pharmacy data."
)

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def read_root():
    return FileResponse("static/index.html")

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return FileResponse("static/favicon.png")

DB_PATH = 'pharmacy.db'

# Haversine formula to calculate distance between two lat/lon points
def haversine(lat1, lon1, lat2, lon2):
    if None in (lat1, lon1, lat2, lon2):
        return float('inf')
    R = 6371.0 # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # Register haversine function in SQLite so we can use it in queries
    conn.create_function("haversine", 4, haversine)
    return conn

# --- Pydantic Models ---

class PharmacyResponse(BaseModel):
    id: str
    name: str
    type_code: Optional[int]
    type_name: Optional[str]
    province_code: Optional[int]
    province_name: Optional[str]
    city_code: Optional[int]
    city_name: Optional[str]
    town: Optional[str]
    zip_code: Optional[int]
    address: Optional[str]
    phone: Optional[str]
    open_date: Optional[str]
    lon: Optional[float]
    lat: Optional[float]
    fax_number: Optional[str]
    distance_km: Optional[float] = None

class FaxUpdateRequest(BaseModel):
    fax_number: str

# --- API Endpoints ---

@app.get("/api/pharmacies", response_model=List[PharmacyResponse])
def get_pharmacies(skip: int = 0, limit: int = 50):
    """Get a paginated list of all pharmacies."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM pharmacies LIMIT ? OFFSET ?", (limit, skip))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.get("/api/pharmacies/search", response_model=List[PharmacyResponse])
def search_pharmacies(keyword: str = Query(..., description="Pharmacy name or address snippet")):
    """Search for pharmacies by name or address."""
    conn = get_db_connection()
    cursor = conn.cursor()
    search_term = f"%{keyword}%"
    cursor.execute(
        "SELECT * FROM pharmacies WHERE name LIKE ? OR address LIKE ? LIMIT 50",
        (search_term, search_term)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.get("/api/pharmacies/nearby", response_model=List[PharmacyResponse])
def get_nearby_pharmacies(
    address: str = Query(..., description="Address to search near"),
    radius: float = Query(1.0, description="Search radius in kilometers")
):
    """Find pharmacies near a specific address using Kakao API for geocoding."""
    lon, lat = geocode_address(address)
    
    if lon is None or lat is None:
        raise HTTPException(status_code=400, detail="Could not geocode the provided address.")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Query pharmacies and calculate distance. SQLite custom function haversine is used.
    # Note: We query all and filter, or we could do a rough bounding box first.
    # For ~25k rows, calculating haversine for all might be acceptable in SQLite.
    query = """
        SELECT *, haversine(?, ?, lat, lon) as distance_km
        FROM pharmacies
        WHERE distance_km <= ?
        ORDER BY distance_km ASC
        LIMIT 50
    """
    cursor.execute(query, (lat, lon, radius))
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

@app.patch("/api/pharmacies/{pharmacy_id}/fax")
def update_fax_number(
    pharmacy_id: str = Path(..., description="The ID of the pharmacy (암호화요양기호)"),
    request: FaxUpdateRequest = ...
):
    """Update the fax number for a specific pharmacy."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if exists
    cursor.execute("SELECT id FROM pharmacies WHERE id = ?", (pharmacy_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Pharmacy not found")
        
    # Update
    cursor.execute(
        "UPDATE pharmacies SET fax_number = ? WHERE id = ?",
        (request.fax_number, pharmacy_id)
    )
    conn.commit()
    conn.close()
    
    return {"message": "Fax number updated successfully", "pharmacy_id": pharmacy_id, "fax_number": request.fax_number}

if __name__ == "__main__":
    # Start the server on port 3008 as agreed
    uvicorn.run("main:app", host="localhost", port=3008, reload=True)
    
