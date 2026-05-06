from flask import Flask, request, jsonify, render_template
import numpy as np
import pandas as pd
from flask_cors import CORS
import os
from joblib import load

app = Flask(__name__)
CORS(app)

try:
    model = load('clinker_model_final.pkl')
    print("Model loaded successfully")
except FileNotFoundError:
    print("Error: model file not found")
    model = None

FEATURE_RANGES = {
    'Limestone_%':    (75, 80),
    'Clay_%':         (10, 15),
    'Silica_%':       (5, 15),
    'Temperature_C':  (1400, 1450),
    'Time_min':       (20, 30),
    'gypsum':         (3, 6),
    'CaO':            (60, 70),
    'SiO2':           (15, 25),
    'Al2O3':          (3, 8),
    'Fe2O3':          (2, 5),
    'moisture':       (1, 3),
    'particle_size':  (90, 120),
}

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        if model is None:
            return jsonify({'error': 'Model not loaded'}), 500

        data = request.get_json()

        features_order = [
            'Limestone_%', 'Clay_%', 'Silica_%', 'Temperature_C', 'Time_min',
            'gypsum', 'CaO', 'SiO2', 'Al2O3', 'Fe2O3', 'moisture', 'particle_size'
        ]

        values = {}
        for key in features_order:
            val = data.get(key)
            if val is None:
                return jsonify({'error': f'Missing field: {key}'}), 400
            values[key] = float(val)

        for key, (lo, hi) in FEATURE_RANGES.items():
            if not (lo <= values[key] <= hi):
                return jsonify({'error': f'{key} must be between {lo} and {hi}'}), 400

        feature_array = pd.DataFrame([[values[k] for k in features_order]], columns=features_order)
        prediction = model.predict(feature_array)[0]

        return jsonify({
            'prediction': float(prediction),
            'features': values
        })

    except ValueError:
        return jsonify({'error': 'Invalid input values. Please enter numeric values.'}), 400
    except Exception as e:
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
