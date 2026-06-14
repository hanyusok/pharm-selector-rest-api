document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const resultsList = document.getElementById('results-list');
    const statusMessage = document.getElementById('status-message');
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    // State
    let searchType = 'nearby'; // 'nearby' or 'keyword'
    let map;
    let markers = [];
    let currentOverlay = null;

    // Initialize Map
    function initMap() {
        const container = document.getElementById('map');
        if (typeof kakao === 'undefined' || !kakao.maps || !kakao.maps.Map) {
            console.warn("Kakao Maps SDK could not be loaded or is not defined. Map visualization will be disabled.");
            showMapErrorPlaceholder();
            return;
        }
        try {
            const options = {
                center: new kakao.maps.LatLng(37.5665, 126.9780), // Default: Seoul
                level: 5
            };
            map = new kakao.maps.Map(container, options);
        } catch (error) {
            console.error("Error initializing Kakao Map:", error);
            showMapErrorPlaceholder();
        }
    }

    function showMapErrorPlaceholder() {
        const placeholder = document.getElementById('map-error-placeholder');
        if (placeholder) {
            placeholder.style.display = 'flex';
        }
    }

    // Handle Tabs
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            searchType = btn.dataset.type;
            
            if (searchType === 'nearby') {
                searchInput.placeholder = "Enter an address (e.g. 지곡면)";
            } else {
                searchInput.placeholder = "Enter pharmacy name";
            }
            searchInput.value = '';
            searchInput.focus();
        });
    });

    // Handle Search
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (!query) return;

        statusMessage.textContent = 'Searching...';
        resultsList.innerHTML = '';
        clearMarkers();

        try {
            let url = '';
            if (searchType === 'nearby') {
                url = `/api/pharmacies/nearby?address=${encodeURIComponent(query)}&radius=5`;
            } else {
                url = `/api/pharmacies/search?keyword=${encodeURIComponent(query)}`;
            }

            const res = await fetch(url);
            if (!res.ok) {
                throw new Error('API Error');
            }
            const data = await res.json();
            
            if (data.length === 0) {
                statusMessage.textContent = 'No pharmacies found.';
                return;
            }

            statusMessage.textContent = `Found ${data.length} pharmacies.`;
            renderPharmacies(data);
            
            // Pan map to first result if available (only if Kakao SDK loaded successfully)
            if (typeof kakao !== 'undefined' && map && data[0] && data[0].lat && data[0].lon) {
                try {
                    const center = new kakao.maps.LatLng(data[0].lat, data[0].lon);
                    map.panTo(center);
                    
                    // Adjust bounds to fit all markers if searching by keyword
                    if (data.length > 1) {
                        const bounds = new kakao.maps.LatLngBounds();
                        data.forEach(p => {
                            if(p.lat && p.lon) bounds.extend(new kakao.maps.LatLng(p.lat, p.lon));
                        });
                        map.setBounds(bounds);
                    }
                } catch (mapErr) {
                    console.error("Error setting map bounds/center:", mapErr);
                }
            }

        } catch (error) {
            statusMessage.textContent = 'Error occurred during search.';
            console.error(error);
        }
    });

    // Render Pharmacies
    function renderPharmacies(pharmacies) {
        pharmacies.forEach(pharm => {
            // Create list item
            const card = document.createElement('div');
            card.className = 'pharmacy-card';
            
            const distanceHtml = pharm.distance_km !== null ? 
                `<span class="pharmacy-distance">${pharm.distance_km.toFixed(2)} km</span>` : '';
            
            const phone = pharm.phone || 'No phone provided';
            const fax = pharm.fax_number || 'Not provided';
            
            card.innerHTML = `
                <div class="pharmacy-name">
                    ${pharm.name}
                    ${distanceHtml}
                </div>
                <div class="pharmacy-address">${pharm.address}</div>
                <div class="pharmacy-details">
                    <div class="detail-row">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        <span>${phone}</span>
                    </div>
                    <div class="detail-row">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
                        <span id="fax-display-${pharm.id}">${fax}</span>
                    </div>
                </div>
                <div class="fax-section">
                    <div style="font-size:12px;color:var(--text-secondary)">Help others by updating the Fax number:</div>
                    <form class="fax-form" data-id="${pharm.id}">
                        <input type="text" placeholder="e.g. 02-1234-5678" required>
                        <button type="submit" class="fax-submit">Update</button>
                    </form>
                </div>
            `;
            
            // Map Marker Logic
            if (typeof kakao !== 'undefined' && map && pharm.lat && pharm.lon) {
                try {
                    const position = new kakao.maps.LatLng(pharm.lat, pharm.lon);
                    
                    const marker = new kakao.maps.Marker({
                        position: position,
                        map: map
                    });
                    markers.push(marker);
                    
                    const content = `
                        <div class="custom-overlay">
                            <div class="custom-overlay-name">${pharm.name}</div>
                            <div class="custom-overlay-addr">${pharm.address}</div>
                        </div>
                    `;
                    const overlay = new kakao.maps.CustomOverlay({
                        content: content,
                        position: position,
                        yAnchor: 2.2
                    });
                    
                    // Events
                    kakao.maps.event.addListener(marker, 'click', () => {
                        if (currentOverlay) currentOverlay.setMap(null);
                        overlay.setMap(map);
                        currentOverlay = overlay;
                        map.panTo(position);
                        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    });
                    
                    card.addEventListener('click', (e) => {
                        // Don't trigger map pan if clicking input or button
                        if(e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                        
                        if (currentOverlay) currentOverlay.setMap(null);
                        overlay.setMap(map);
                        currentOverlay = overlay;
                        map.panTo(position);
                    });
                } catch (markerErr) {
                    console.error("Error creating marker/overlay:", markerErr);
                }
            }
            
            resultsList.appendChild(card);
        });

        // Add Fax Update Listeners
        document.querySelectorAll('.fax-form').forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = form.dataset.id;
                const input = form.querySelector('input');
                const newFax = input.value.trim();
                const btn = form.querySelector('button');
                
                const origText = btn.textContent;
                btn.textContent = '...';
                
                try {
                    const res = await fetch(`/api/pharmacies/${id}/fax`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fax_number: newFax })
                    });
                    
                    if (res.ok) {
                        const data = await res.json();
                        document.getElementById(`fax-display-${id}`).textContent = data.fax_number;
                        input.value = '';
                        btn.style.background = 'var(--accent)';
                        btn.textContent = 'Done!';
                        setTimeout(() => {
                            btn.style.background = 'var(--success)';
                            btn.textContent = origText;
                        }, 2000);
                    } else {
                        btn.textContent = 'Failed';
                    }
                } catch (err) {
                    btn.textContent = 'Error';
                }
            });
        });
    }

    function clearMarkers() {
        if (typeof kakao !== 'undefined' && map) {
            markers.forEach(m => {
                try { m.setMap(null); } catch (e) {}
            });
        }
        markers = [];
        if (currentOverlay) {
            try { currentOverlay.setMap(null); } catch (e) {}
            currentOverlay = null;
        }
    }

    // Init
    initMap();
});
