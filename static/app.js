document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const resultsList = document.getElementById('results-list');
    const statusMessage = document.getElementById('status-message');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const modeHint = document.getElementById('mode-hint');

    let searchType = 'list';

    function setMode(type) {
        searchType = type;
        tabBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.type === type));

        if (type === 'nearby') {
            searchInput.placeholder = 'Use your current location';
            searchInput.value = '';
            modeHint.textContent = 'Nearby search uses browser location and returns pharmacies within 5 km.';
        } else if (type === 'search') {
            searchInput.placeholder = 'Search by pharmacy name or address';
            searchInput.value = '';
            modeHint.textContent = 'Search filters the pharmacy list by name or address text.';
        } else {
            searchInput.placeholder = 'Browse all pharmacies';
            searchInput.value = '';
            modeHint.textContent = 'Listing mode shows the latest pharmacies from the local database.';
        }
    }

    function renderPharmacies(pharmacies) {
        resultsList.innerHTML = '';

        const countEl = document.getElementById('results-count');
        if (countEl) {
            countEl.textContent = `${pharmacies.length} pharmacies found`;
        }

        if (!pharmacies.length) {
            resultsList.innerHTML = '<div class="empty-state">No pharmacies matched this request.</div>';
            return;
        }

        pharmacies.forEach((pharm) => {
            const card = document.createElement('article');
            card.className = 'pharmacy-card';

            const distanceHtml = typeof pharm.distance_km === 'number'
                ? `<span class="pharmacy-distance">${pharm.distance_km.toFixed(2)} km</span>`
                : '';

            const phone = pharm.phone || 'No phone provided';
            const fax = pharm.fax_number || 'Not provided';

            card.innerHTML = `
                <div class="pharmacy-name">
                    ${pharm.name}
                    ${distanceHtml}
                </div>
                <div class="pharmacy-address">${pharm.address || 'Address not available'}</div>
                <div class="pharmacy-details">
                    <div class="detail-row">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        <span class="detail-label">Phone:</span>
                        <span>${phone}</span>
                    </div>
                    <div class="detail-row">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
                        <span class="detail-label">Fax:</span>
                        <span id="fax-display-${pharm.id}">${fax}</span>
                        <button class="edit-fax-btn" data-id="${pharm.id}" title="Update fax number" aria-label="Update fax number">
                            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                    </div>
                </div>
                <div class="fax-section" id="fax-section-${pharm.id}">
                    <div class="fax-help">Help others by updating the fax number:</div>
                    <form class="fax-form" data-id="${pharm.id}">
                        <input type="text" placeholder="e.g. 02-1234-5678" required>
                        <button type="submit" class="fax-submit">Update</button>
                    </form>
                </div>
            `;

            resultsList.appendChild(card);
        });

        document.querySelectorAll('.edit-fax-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const section = document.getElementById(`fax-section-${id}`);
                if (section) {
                    section.classList.toggle('expanded');
                }
            });
        });

        document.querySelectorAll('.fax-form').forEach((form) => {
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

                    if (!res.ok) {
                        throw new Error('Fax update failed');
                    }

                    const data = await res.json();
                    document.getElementById(`fax-display-${id}`).textContent = data.fax_number;
                    input.value = '';
                    btn.style.background = 'var(--success)';
                    btn.textContent = 'Done!';
                    setTimeout(() => {
                        btn.style.background = '';
                        btn.textContent = origText;
                        const section = document.getElementById(`fax-section-${id}`);
                        if (section) {
                            section.classList.remove('expanded');
                        }
                    }, 1800);
                } catch (error) {
                    btn.textContent = 'Failed';
                    console.error(error);
                }
            });
        });
    }

    async function loadResults(url, message) {
        statusMessage.textContent = 'Loading...';
        resultsList.innerHTML = '';

        try {
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error('Request failed');
            }

            const data = await res.json();
            statusMessage.textContent = message;
            renderPharmacies(data);
            return data;
        } catch (error) {
            statusMessage.textContent = 'Unable to load pharmacies right now.';
            console.error(error);
            return [];
        }
    }

    tabBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            setMode(btn.dataset.type);
            searchInput.focus();
        });
    });

    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (searchType === 'nearby') {
            if (!navigator.geolocation) {
                statusMessage.textContent = 'This browser does not support location access.';
                return;
            }

            statusMessage.textContent = 'Detecting your location...';
            navigator.geolocation.getCurrentPosition(async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                await loadResults(
                    `/api/pharmacies/nearby?lat=${lat}&lon=${lon}&radius=5`,
                    `Found nearby pharmacies within 5 km of your location.`
                );
            }, () => {
                statusMessage.textContent = 'Location access was denied. Enable location permissions to use Nearby.';
            }, { enableHighAccuracy: true, timeout: 10000 });
            return;
        }

        const query = searchInput.value.trim();

        if (searchType === 'search') {
            if (!query) {
                statusMessage.textContent = 'Enter a pharmacy name or address to search.';
                return;
            }
            await loadResults(`/api/pharmacies/search?keyword=${encodeURIComponent(query)}`, `Showing ${query} matches.`);
            return;
        }

        if (query) {
            await loadResults(`/api/pharmacies/search?keyword=${encodeURIComponent(query)}`, `Showing ${query} matches.`);
        } else {
            await loadResults('/api/pharmacies?limit=100', 'Showing the latest pharmacies from the database.');
        }
    });

    setMode('list');
    loadResults('/api/pharmacies?limit=100', 'Showing the latest pharmacies from the database.');
});
