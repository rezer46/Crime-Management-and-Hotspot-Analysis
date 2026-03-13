from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import mysql.connector
import math

app = Flask(__name__)
CORS(app)

# ---------------- DATABASE ----------------
db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="Appu@2008",
    database="crime_db"
)

cursor = db.cursor(dictionary=True)

# ---------------- SERVE FILES ----------------
@app.route("/")
def home():
    return send_from_directory(".", "login.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(".", path)


# ---------------- REGISTER ----------------
@app.route("/register", methods=["POST"])
def register():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    phone = data.get("phone")

    if not username or not password:
        return jsonify({"message": "Missing fields"}), 400

    try:
        cursor.execute(
            "INSERT INTO user (username,password,role) VALUES (%s,%s,%s)",
            (username, password, "USER")
        )

        db.commit()
        return jsonify({"message": "Registered Successfully"})
    except:
        return jsonify({"message": "Username already exists"}), 400


# ---------------- LOGIN ----------------
@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    cursor.execute(
        "SELECT * FROM user WHERE username=%s AND password=%s",
        (username, password)
    )
    user = cursor.fetchone()

    if user:
        return jsonify({
            "message": "Login Successful",
            "role": user["role"],
            "station_id": user["station_id"]
        })

    else:
        return jsonify({"message": "Invalid Credentials"}), 401


# ---------------- ADD CRIME ----------------
@app.route("/add_crime", methods=["POST"])
def add_crime():
    data = request.json

    fir_no = data.get("fir_no")
    crime_type = data.get("crime_type")
    area_name = data.get("area_name")
    description = data.get("description")
    status = data.get("status")
    crime_date = data.get("crime_date")

    # get type_id
    cursor.execute(
        "SELECT type_id FROM crime_type WHERE type_name=%s",
        (crime_type,)
    )
    type_row = cursor.fetchone()

    if not type_row:
        return jsonify({"message": "Invalid crime type"}), 400

    type_id = type_row["type_id"]

    # get station coordinates
    station_id = 1

    cursor.execute(
        "SELECT latitude, longitude FROM police_station WHERE station_id=%s",
        (station_id,)
    )
    station = cursor.fetchone()

    if not station:
        return jsonify({"message": "Station not found"}), 400

    latitude = station["latitude"]
    longitude = station["longitude"]

    # insert into crime table
    try:
        cursor.execute("""
            INSERT INTO crime
            (fir_no, type_id, station_id, area_name, description, status, crime_date, latitude, longitude)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            fir_no,
            type_id,
            station_id,
            area_name,
            description,
            status,
            crime_date,
            latitude,
            longitude
        ))

        db.commit()
        return jsonify({"message": "Crime Added Successfully"})

    except mysql.connector.Error:
        return jsonify({"message": "FIR already exists"}), 400


# ---------------- GET CRIMES ----------------
@app.route("/get_crimes", methods=["GET"])
def get_crimes():

    query = """
        SELECT 
            c.crime_id,
            c.fir_no,
            ct.type_name AS crime_type,
            c.area_name,
            c.description,
            c.status,
            c.crime_date,
            c.latitude,
            c.longitude
        FROM crime c
        JOIN crime_type ct ON c.type_id = ct.type_id
        ORDER BY c.crime_id DESC
    """

    cursor.execute(query)
    crimes = cursor.fetchall()

    return jsonify(crimes)


# ---------------- NEAREST POLICE STATION ----------------
@app.route("/nearest_station")
def nearest_station():

    lat = float(request.args.get("lat"))
    lon = float(request.args.get("lon"))

    cursor.execute("SELECT * FROM police_station")
    stations = cursor.fetchall()

    nearest = None
    min_distance = 999999

    for s in stations:

        dist = math.sqrt(
            (lat - float(s["latitude"]))**2 +
            (lon - float(s["longitude"]))**2
        )

        if dist < min_distance:
            min_distance = dist
            nearest = s

    if not nearest:
        return jsonify({"error": "No station found"}), 404

    return jsonify({
        "name": nearest["station_name"],
        "distance": min_distance * 111,
        "contact": nearest["contact"]
    })

if __name__ == "__main__":
    app.run(debug=True)