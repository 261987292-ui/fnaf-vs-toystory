from flask import Flask, jsonify, render_template, request

app = Flask(__name__)
state = {
    "missions": {"current": 1, "progress": 0, "unlocked": 1},
    "pvp": {"rooms": {}, "players": {}},
}


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/estado", methods=["GET", "POST"])
def estado():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        if "missions" in data:
            state["missions"].update(data["missions"])
        return jsonify({"ok": True, "estado": state["missions"]}), 200
    return jsonify(state["missions"])


@app.route("/api/pvp", methods=["GET", "POST"])
def pvp():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        room = str(data.get("room", "arena-1"))[:24]
        player_id = str(data.get("id", "guest"))[:24]
        state["pvp"]["rooms"].setdefault(room, {})
        state["pvp"]["rooms"][room][player_id] = {
            "character": str(data.get("character", "freddy"))[:24],
            "team": str(data.get("team", "fnaf"))[:24],
            "x": float(data.get("x", 0)),
            "z": float(data.get("z", 0)),
            "yaw": float(data.get("yaw", 0)),
            "weapon": str(data.get("weapon", "blaster"))[:24],
            "kills": int(data.get("kills", 0)),
            "health": max(0, int(data.get("health", 100))),
        }
        state["pvp"]["players"] = state["pvp"]["rooms"][room]
        return jsonify({"ok": True, "players": state["pvp"]["players"]})
    room = str(request.args.get("room", "arena-1"))[:24]
    return jsonify({"players": state["pvp"]["rooms"].get(room, {})})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
