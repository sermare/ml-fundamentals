import json
import re
from pathlib import Path

from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

QUESTIONS_DIR = Path(__file__).parent / "questions"


def load_questions():
    """Load all question JSON files from the questions directory."""
    questions = []
    for filepath in sorted(QUESTIONS_DIR.glob("*.json")):
        with open(filepath) as f:
            data = json.load(f)
            for q in data["questions"]:
                q["topic"] = data["topic"]
                q["topic_id"] = filepath.stem
                questions.append(q)
    return questions


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/questions")
def get_questions():
    questions = load_questions()
    # Strip answers before sending to client
    sanitized = []
    for q in questions:
        sanitized.append({
            "id": q["id"],
            "topic": q["topic"],
            "topic_id": q["topic_id"],
            "title": q["title"],
            "difficulty": q["difficulty"],
            "description": q["description"],
            "code": q["code"],
            "blanks": [
                {"id": b["id"], "placeholder": b.get("placeholder", "___")}
                for b in q["blanks"]
            ],
        })
    return jsonify(sanitized)


@app.route("/api/check", methods=["POST"])
def check_answer():
    data = request.json
    question_id = data.get("question_id")
    answers = data.get("answers", {})

    questions = load_questions()
    question = next((q for q in questions if q["id"] == question_id), None)

    if not question:
        return jsonify({"error": "Question not found"}), 404

    results = {}
    all_correct = True

    for blank in question["blanks"]:
        blank_id = blank["id"]
        user_answer = answers.get(blank_id, "").strip()
        acceptable = blank["acceptable"]

        correct = False
        for pattern in acceptable:
            # Normalize whitespace for comparison
            normalized_user = re.sub(r"\s+", " ", user_answer).strip()
            normalized_pattern = re.sub(r"\s+", " ", pattern).strip()
            if normalized_user == normalized_pattern:
                correct = True
                break

        results[blank_id] = {
            "correct": correct,
            "hint": blank.get("hint", "") if not correct else "",
        }
        if not correct:
            all_correct = False

    return jsonify({"all_correct": all_correct, "results": results})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
