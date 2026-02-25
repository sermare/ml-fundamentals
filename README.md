# ML Fundamentals

A LeetCode-style practice app for core machine learning concepts. Fill in the blanks to test your understanding of ML implementations.

## Quick Start

```bash
pip install flask
python app.py
```

Then open http://localhost:5000 in your browser.

## Topics

- Linear Algebra
- Activation Functions
- Loss Functions
- Multi-Layer Perceptrons
- Backpropagation
- Convolutional Neural Networks
- Optimizers
- Regularization
- Recurrent Neural Networks
- Attention & Transformers

## Adding Questions

Drop a JSON file in `questions/`. Format:

```json
{
    "topic": "Topic Name",
    "questions": [
        {
            "id": "unique_id",
            "title": "Question Title",
            "difficulty": "easy|medium|hard",
            "description": "What to implement.",
            "code": "code with {{blank_id}} placeholders",
            "blanks": [
                {
                    "id": "blank_id",
                    "placeholder": "hint text shown in input",
                    "acceptable": ["answer1", "answer2"],
                    "hint": "Hint shown on wrong answer"
                }
            ]
        }
    ]
}
```
