# 🏥 Pharmacy Locator - Premium Edition

A modern, high-performance **FastAPI & SQLite** web application designed to help users locate pharmacies across South Korea, crowdsource/update pharmacy fax numbers, and visualize locations on an interactive map using the **Kakao Maps SDK**.

---

## 🚀 Key Features

* **Advanced Nearby Search**: Finds pharmacies within a specific radius (default 5km) from a given location. Powered by the Kakao Local API with automatic fallback:
  * First, queries the **Address Search API** to resolve formal postal addresses.
  * If no address is found, automatically queries the **Keyword Search API** to resolve landmarks, subway stations, or building names (e.g., searching `"제일약국"` or `"강남역"`).
* **Keyword Database Search**: Directly query the local SQLite database by pharmacy name or address snippet.
* **Interactive Kakao Map**: Visualizes search results on a map with customized overlays, click-to-pan, list-syncing behavior, and boundary adjustments.
* **Crowdsourced Fax Directory**: Users can submit and update missing or incorrect fax numbers for any pharmacy, which are saved instantly to the local database.
* **Robust Fail-Safe UI**: The map area handles Kakao SDK loading failures (e.g. unregistered domain key errors) gracefully by displaying a warning message and setup instructions, while keeping search and list results fully functional.
* **Premium Aesthetics**: Fully responsive dark mode interface designed with modern HSL CSS variables, smooth micro-animations, glassmorphism containers, and typography loaded via Google Fonts.

---

## 🛠️ Technology Stack

* **Backend**:
  * [FastAPI](https://fastapi.tiangolo.com/) - High-performance Python web framework.
  * [SQLite](https://www.sqlite.org/) - Lightweight relational database with custom registered Python SQL functions for Haversine distance calculations.
  * [Pandas](https://pandas.pydata.org/) - Used for initial CSV data parsing and database seeding.
* **Geocoding Integrations**:
  * [Kakao Local API](https://developers.kakao.com/docs/latest/ko/local/common) (Address and Keyword Search).
* **Frontend**:
  * [Vanilla HTML5 / CSS3](https://developer.mozilla.org/en-US/docs/Web/CSS) - Sleek styling with CSS variables.
  * [Vanilla JavaScript (ES6+)](https://developer.mozilla.org/en-US/docs/Web/JavaScript) - Asynchronous API integration and state management.
  * [Kakao Maps Web SDK](https://apis.map.kakao.com/web/) - Interactive mapping, markers, and custom overlays.

---

## 📂 Project Structure

```bash
pharm-selector-rest-api/
├── static/                   # Front-end Assets
│   ├── index.html            # Main HTML page
│   ├── style.css             # Premium CSS styling
│   ├── app.js                # Frontend client logic
│   └── favicon.png           # App favicon icon
├── database.py               # Database seeder & setup script
├── kakao_api.py              # Backend geocoding API wrappers (Kakao Local)
├── main.py                   # FastAPI REST API implementation & server entrypoint
├── pharm_db.csv              # Source CSV pharmacy dataset
├── pharmacy.db               # Seoded SQLite Database (auto-generated)
└── requirements.txt          # Python dependencies list
```

---

## 🗄️ Database Schema

The SQLite database (`pharmacy.db`) contains a `pharmacies` table seeded from `pharm_db.csv` with the following columns:

| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | `TEXT` (Primary Key) | Encrypted pharmacy ID (`암호화요양기호`) |
| `name` | `TEXT` | Pharmacy Name (`요양기관명`) |
| `type_code` | `INTEGER` | Category Type Code (`종별코드`) |
| `type_name` | `TEXT` | Category Type Name (`종별코드명`) |
| `province_code`| `INTEGER` | Province Code (`시도코드`) |
| `province_name`| `TEXT` | Province Name (`시도코드명`) |
| `city_code` | `INTEGER` | City/District Code (`시군구코드`) |
| `city_name` | `TEXT` | City/District Name (`시군구코드명`) |
| `town` | `TEXT` | Town/Sub-district (`읍면동`) |
| `zip_code` | `INTEGER` | Zip Code (`우편번호`) |
| `address` | `TEXT` | Full Street Address (`주소`) |
| `phone` | `TEXT` | Telephone Number (`전화번호`) |
| `open_date` | `TEXT` | Business Open Date (`개설일자`) |
| `lon` | `REAL` | Longitude Coordinate (`좌표(X)`) |
| `lat` | `REAL` | Latitude Coordinate (`좌표(Y)`) |
| `fax_number` | `TEXT` (Nullable) | Crowdsourced Fax Number (initialized to `NULL`) |

*Database Indexes are configured on `name`, `address`, and `(lat, lon)` for high-performance lookup.*

---

## 🔌 API Endpoints

### 📄 Static Serving
* `GET /` - Serves the frontend single-page application (`index.html`).
* `GET /favicon.ico` - Serves the application favicon image.

### 🏥 Pharmacy Endpoints
* `GET /api/pharmacies?skip=0&limit=50` - Get a paginated list of all pharmacies.
* `GET /api/pharmacies/search?keyword=...` - Searches pharmacies by name or address keyword snippet (max 50 results).
* `GET /api/pharmacies/nearby?address=...&radius=5.0` - Performs geolocation fallback search on the query location, calculates distances for all entries using Haversine formula, and returns nearby pharmacies sorted by distance (max 50 results).
* `PATCH /api/pharmacies/{pharmacy_id}/fax` - Updates the fax number for a specific pharmacy. Expects JSON payload:
  ```json
  {
    "fax_number": "02-1234-5678"
  }
  ```

---

## 🛠️ Setup & Running Locally

### 1. Prerequisite Installations
Make sure Python 3.8+ is installed. Clone the repository and install the required dependencies:
```bash
pip install -r requirements.txt
```

### 2. Initialize the Database
Extract and seed the SQLite database from the CSV dataset:
```bash
python database.py
```
This parses the CSV, renames columns, sets up indexes, and creates `pharmacy.db`.

### 3. Run the Server
Launch the FastAPI development server:
```bash
python main.py
```
By default, the application runs on **`http://localhost:3008`**.

---

## 🔑 Kakao Developers API Key & Domain Registration

The project includes pre-configured Kakao API credentials:
* **Backend REST API Key** (in `kakao_api.py`): Used for geocoding fallback services.
* **Frontend JavaScript Key** (in `index.html`): Used to load the Kakao Maps Web SDK.

### ⚠️ Domain Authorization Requirement
Because Kakao Maps Web SDK restricts script executions to registered domains, **the map will load as a dark grey area until your local development host is registered in your Kakao Developer Console**:
1. Log in to [Kakao Developers](https://developers.kakao.com/).
2. Select **My Application** > Select the active Application.
3. Under **App Settings**, go to **Platforms** > **Web**.
4. Add **`http://localhost:3008`** (and/or any other port you run the server on) to the **Site Domain** list.
5. Save the configuration and reload the application page in your browser.
