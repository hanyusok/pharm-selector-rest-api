import os

import requests


def get_kakao_rest_api_key():
    """Read the Kakao REST API key from the environment, if available."""
    return os.getenv("KAKAO_REST_API_KEY")


# Kakao Local API requires the REST API Key. Using the JavaScript Key here will cause a 401 Client Error.
KAKAO_REST_API_KEY = get_kakao_rest_api_key()

def geocode_address(address: str):
    """
    Given an address string, returns (longitude, latitude) using Kakao Local API.
    Returns (None, None) if not found.
    """
    api_key = get_kakao_rest_api_key() or KAKAO_REST_API_KEY
    if not api_key:
        print("Kakao REST API key is not configured. Nearby geocoding is unavailable.")
        return None, None

    url = "https://dapi.kakao.com/v2/local/search/address.json"
    headers = {
        "Authorization": f"KakaoAK {api_key}"
    }
    params = {
        "query": address
    }
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        if data.get("documents"):
            # Get the first result
            doc = data["documents"][0]
            # Kakao returns string for coordinates, need to cast to float
            return float(doc["x"]), float(doc["y"])
        
        # Fallback to local keyword search (e.g. for landmarks, pharmacy names)
        keyword_url = "https://dapi.kakao.com/v2/local/search/keyword.json"
        response = requests.get(keyword_url, headers=headers, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        if data.get("documents"):
            doc = data["documents"][0]
            return float(doc["x"]), float(doc["y"])
            
        return None, None
    except Exception as e:
        print(f"Error calling Kakao API: {e}")
        return None, None
