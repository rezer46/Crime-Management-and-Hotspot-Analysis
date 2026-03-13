const MAP_API = "http://127.0.0.1:5000";

document.addEventListener("DOMContentLoaded", async () => {

    const mapEl = document.getElementById("map");
    if (!mapEl || typeof L === "undefined") return;

    // ---------------- FETCH CRIMES FROM DATABASE ----------------
    async function fetchCrimes() {
        try {
            const response = await fetch(MAP_API + "/get_crimes");
            return await response.json();
        } catch (err) {
            console.error("Error fetching crimes:", err);
            return [];
        }
    }

    const crimes = await fetchCrimes();

    // ---------------- MAP SETUP ----------------
    const indiaBounds = L.latLngBounds([6.0, 68.0], [37.6, 97.5]);

    const map = L.map("map", {
        minZoom: 7,
        maxZoom: 14,
        maxBounds: indiaBounds,
        maxBoundsViscosity: 1.0,
        worldCopyJump: false
    }); map.setView([9.9312, 76.2673], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "OpenStreetMap Contributors",
        noWrap: true
    }).addTo(map);

    if (!crimes || crimes.length === 0) {
        console.log("No crimes found.");
        return;
    }

    // ---------------- GROUP BY AREA ----------------
    function normalizeArea(value) {
        return String(value || "").toLowerCase().replace(/\s+/g, "").trim();
    }

    function riskFromCount(count) {
        if (count >= 5) return "HIGH";
        if (count >= 4) return "MEDIUM";
        if (count >= 3) return "LOW";
        return "LOWEST";
    }

    const grouped = {};

    crimes.forEach(crime => {

        if (crime.latitude == null || crime.longitude == null) return;

        const key = normalizeArea(crime.area_name);

        if (!grouped[key]) {
            grouped[key] = {
                area: crime.area_name,
                latitudeTotal: 0,
                longitudeTotal: 0,
                count: 0
            };
        }

        grouped[key].latitudeTotal += parseFloat(crime.latitude);
        grouped[key].longitudeTotal += parseFloat(crime.longitude);
        grouped[key].count += 1;
    });

    const hotspots = Object.values(grouped).map(g => ({
        area: g.area,
        latitude: g.latitudeTotal / g.count,
        longitude: g.longitudeTotal / g.count,
        crime_count: g.count,
        risk: riskFromCount(g.count)
    }));

    // ---------------- HEATMAP ----------------
    const heatPoints = hotspots.map(h => [
        h.latitude,
        h.longitude,
        h.crime_count
    ]);

    if (typeof L.heatLayer === "function" && heatPoints.length > 0) {
        L.heatLayer(heatPoints, {
            radius: 40,
            blur: 40,
            maxZoom: 12
        }).addTo(map);
    }

    // ---------------- MARKERS ----------------
    hotspots.forEach(h => {
        L.circleMarker([h.latitude, h.longitude], {
            radius: 6,
            color: "#e53935",
            fillOpacity: 0.8
        })
        .bindPopup(`
            <b>Area:</b> ${h.area}<br>
            <b>Crime Count:</b> ${h.crime_count}<br>
            <b>Risk:</b> ${h.risk}
        `)
        .addTo(map);
    });

});