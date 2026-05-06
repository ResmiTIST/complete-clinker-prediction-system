from flask import Flask, request, jsonify, render_template
import numpy as np
import pandas as pd
from flask_cors import CORS
import os
from joblib import load

app = Flask(__name__)
CORS(app)

# Load trained model
try:
    with open('clinker_model_final.pkl', 'rb') as f:
        model = load('clinker_model_final.pkl')
    print("Model loaded successfully")
except FileNotFoundError:
    print("Error: model file not found")
    model = None

FEATURE_RANGES = {
    'limestone':    (0, 100),
    'clay':         (0, 100),
    'sand':         (0, 100),
    'gypsum':       (0, 20),
    'CaO':          (0, 100),
    'SiO2':         (0, 100),
    'Al2O3':        (0, 100),
    'Fe2O3':        (0, 100),
    'moisture':     (0, 20),
    'particle_size':(0, 500),
    'temperature':  (800, 1600),
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
            'limestone', 'clay', 'sand', 'gypsum',
            'CaO', 'SiO2', 'Al2O3', 'Fe2O3',
            'moisture', 'particle_size', 'temperature'
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

        # feature_array = np.array([[values[k] for k in features_order]])
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
