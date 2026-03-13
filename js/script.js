const API = "http://127.0.0.1:5000";

// reusable table renderer
function displayCrimes(crimes) {

    const tableBody = document.getElementById("resultsBody");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    if (!crimes || crimes.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6">No matching crimes found</td>
            </tr>
        `;
        return;
    }

    crimes.forEach(crime => {

        tableBody.innerHTML += `
            <tr>
                <td>${crime.fir_no}</td>
                <td>${crime.crime_type}</td>
                <td>${crime.area_name}</td>
                <td>${crime.description}</td>
                <td>${crime.crime_date}</td>
                <td>${crime.status}</td>
            </tr>
        `;

    });
}

document.addEventListener("DOMContentLoaded", () => {

    // ---------------- REGISTER ----------------
    const registerForm = document.getElementById("registerForm");

    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const formData = new FormData(registerForm);

            const response = await fetch(API + "/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: formData.get("username"),
                    password: formData.get("password")
                })
            });

            const data = await response.json();
            alert(data.message);

            if (response.ok) {
                window.location.href = "login.html";
            }
        });
    }

    // ---------------- LOGIN ----------------
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const formData = new FormData(loginForm);

            const response = await fetch(API + "/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: formData.get("username"),
                    password: formData.get("password")
                })
            });

            const data = await response.json();

            if (response.ok) {

                localStorage.setItem("role", data.role);
                localStorage.setItem("station_id", data.station_id);

                if (data.role === "OFFICER") {
                    window.location.href = "police-dashboard.html";
                } else {
                    window.location.href = "user-dashboard.html";
                }

            } else {
                alert(data.message);
            }
        });
    }

    // ---------------- LOAD CRIMES ----------------
    async function loadCrimes() {

        const response = await fetch(API + "/get_crimes");
        const crimes = await response.json();

        displayCrimes(crimes);
    }

    loadCrimes();

    // ---------------- FILTER SEARCH ----------------
    const filterForm = document.getElementById("userCaseFilterForm");

    if (filterForm) {

        filterForm.addEventListener("submit", async (e) => {

            e.preventDefault();

            const formData = new FormData(filterForm);

            const fir = formData.get("fir_no")?.toLowerCase();
            const location = formData.get("location")?.toLowerCase();
            const crimeDate = formData.get("crime_date");
            const crimeType = formData.get("crime_type")?.toLowerCase();
            const status = formData.get("status");

            const response = await fetch(API + "/get_crimes");
            const crimes = await response.json();

            const filtered = crimes.filter(c => {

                return (
                    (!fir || c.fir_no.toLowerCase().includes(fir)) &&
                    (!location || c.area_name.toLowerCase().includes(location)) &&
                    (!crimeType || c.crime_type.toLowerCase().includes(crimeType)) &&
                    (!status || c.status === status) &&
                    (!crimeDate || new Date(c.crime_date).toISOString().split("T")[0] === crimeDate)
                );

            });

            displayCrimes(filtered);

        });

        filterForm.addEventListener("reset", () => {
            setTimeout(() => {
                loadCrimes();
            }, 50);
        });
    }

    // ---------------- AREA SEARCH ----------------
    const areaSearchForm = document.getElementById("areaSearchForm");

    if (areaSearchForm) {

        areaSearchForm.addEventListener("submit", async (e) => {

            e.preventDefault();

            const searchValue = document
                .getElementById("areaSearchInput")
                .value
                .trim()
                .toLowerCase();

            if (searchValue === "") {
                loadCrimes();
                return;
            }

            const response = await fetch(API + "/get_crimes");
            const crimes = await response.json();

            const filtered = crimes.filter(crime =>
                crime.area_name &&
                crime.area_name.toLowerCase().includes(searchValue)
            );

            displayCrimes(filtered);
        });
    }

    // ---------------- ADD CRIME ----------------
    const firButton = document.getElementById("registerFIR");

    if (firButton) {

        firButton.addEventListener("click", async () => {

            const firForm = document.getElementById("firForm");
            const formData = new FormData(firForm);

            const response = await fetch(API + "/add_crime", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fir_no: formData.get("fir_no"),
                    crime_type: formData.get("crime_type"),
                    area_name: formData.get("area_name"),
                    description: formData.get("description"),
                    status: formData.get("status"),
                    crime_date: formData.get("crime_date")
                })
            });

            const data = await response.json();
            alert(data.message);

            if (response.ok) {
                firForm.reset();
            }
        });
    }
});

// ---------------- DASHBOARD CHARTS ----------------
async function loadCharts() {

    const response = await fetch(API + "/get_crimes");
    const crimes = await response.json();

    if (!crimes || crimes.length === 0) return;

    const dateCounts = {};

    crimes.forEach(c => {

        const date = new Date(c.crime_date).toLocaleDateString();

        if (!dateCounts[date]) dateCounts[date] = 0;

        dateCounts[date]++;

    });

    const dates = Object.keys(dateCounts);
    const counts = Object.values(dateCounts);

    const trendCanvas = document.getElementById("trendChart");

    if (trendCanvas) {

        new Chart(trendCanvas, {
            type: "line",
            data: {
                labels: dates,
                datasets: [{
                    label: "Crime Count",
                    data: counts,
                    borderColor: "red",
                    fill: false
                }]
            }
        });
    }

    const typeCounts = {};

    crimes.forEach(c => {

        if (!typeCounts[c.crime_type]) typeCounts[c.crime_type] = 0;

        typeCounts[c.crime_type]++;

    });

    const types = Object.keys(typeCounts);
    const values = Object.values(typeCounts);

    const pieCanvas = document.getElementById("distributionChart");

    if (pieCanvas) {

        new Chart(pieCanvas, {
            type: "pie",
            data: {
                labels: types,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        "#e53935",
                        "#1e88e5",
                        "#43a047",
                        "#fb8c00",
                        "#8e24aa"
                    ]
                }]
            }
        });
    }
}

loadCharts();

// ---------------- NEAREST POLICE STATION ----------------
function detectNearestStation() {

    const el = document.getElementById("nearestStation");

    if (!navigator.geolocation) {
        el.innerText = "Location not supported.";
        return;
    }

    navigator.geolocation.getCurrentPosition(async position => {

        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        const response = await fetch(
            API + "/nearest_station?lat=" + lat + "&lon=" + lon
        );

        const station = await response.json();

        if (station.name) {
            el.innerHTML =
                "<strong>" + station.name + "</strong><br>" +
                "Distance: " + station.distance.toFixed(2) + " km<br>" +
                "Contact: " + station.contact;
        }

    }, () => {
        el.innerText = "Location access denied.";
    });
}

detectNearestStation();