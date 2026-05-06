document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('predictionForm');
    const resultDiv = document.getElementById('result');
    const loadingOverlay = document.getElementById('loadingOverlay');

    const FIELDS = [
        'Limestone_%', 'Clay_%', 'Silica_%', 'gypsum',
        'CaO', 'SiO2', 'Al2O3', 'Fe2O3',
        'Temperature_C', 'Time_min', 'moisture', 'particle_size'
    ];

    const RANGES = {
        'Limestone_%':   [75, 80],
        'Clay_%':        [10, 15],
        'Silica_%':      [5, 15],
        'gypsum':        [3, 6],
        'CaO':           [60, 70],
        'SiO2':          [15, 25],
        'Al2O3':         [3, 8],
        'Fe2O3':         [2, 5],
        'Temperature_C': [1400, 1450],
        'Time_min':      [20, 30],
        'moisture':      [1, 3],
        'particle_size': [90, 120],
    };

    const LABELS = {
        'Limestone_%':   'Limestone',
        'Clay_%':        'Clay',
        'Silica_%':      'Silica',
        'gypsum':        'Gypsum',
        'CaO':           'CaO',
        'SiO2':          'SiO₂',
        'Al2O3':         'Al₂O₃',
        'Fe2O3':         'Fe₂O₃',
        'Temperature_C': 'Temperature',
        'Time_min':      'Kiln Time',
        'moisture':      'Moisture',
        'particle_size': 'Part. Size',
    };

    const UNITS = {
        'Limestone_%':   '%',
        'Clay_%':        '%',
        'Silica_%':      '%',
        'gypsum':        '%',
        'CaO':           '%',
        'SiO2':          '%',
        'Al2O3':         '%',
        'Fe2O3':         '%',
        'Temperature_C': '°C',
        'Time_min':      'min',
        'moisture':      '%',
        'particle_size': 'µm',
    };

    // Summary display order — grouped same as the form
    const SUMMARY_ORDER = [
        'Limestone_%', 'Clay_%', 'Silica_%', 'gypsum',
        'CaO', 'SiO2', 'Al2O3', 'Fe2O3',
        'Temperature_C', 'Time_min', 'moisture', 'particle_size'
    ];

    // Live validation
    FIELDS.forEach(name => {
        const input = document.getElementById(name);
        if (!input) return;
        input.addEventListener('input', () => validateInput(input, name));
        input.addEventListener('blur',  () => validateInput(input, name));
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        makePrediction();
    });

    function validateInput(input, name) {
        const value = parseFloat(input.value);
        const [lo, hi] = RANGES[name];
        removeTooltip(input);
        input.classList.remove('error');
        if (input.value === '') return;
        if (isNaN(value) || value < lo || value > hi) {
            input.classList.add('error');
            showTooltip(input, `Must be ${lo}–${hi}`);
        }
    }

    function showTooltip(input, msg) {
        removeTooltip(input);
        const tip = document.createElement('div');
        tip.className = 'tooltip';
        tip.textContent = msg;
        input.parentNode.appendChild(tip);
    }

    function removeTooltip(input) {
        const existing = input.parentNode.querySelector('.tooltip');
        if (existing) existing.remove();
    }

    async function makePrediction() {
        const data = {};
        let hasError = false;

        for (const name of FIELDS) {
            const input = document.getElementById(name);
            const value = parseFloat(input.value);
            const [lo, hi] = RANGES[name];

            if (isNaN(value)) {
                showTooltip(input, 'Required');
                input.classList.add('error');
                hasError = true;
                continue;
            }
            if (value < lo || value > hi) {
                showTooltip(input, `Must be ${lo}–${hi}`);
                input.classList.add('error');
                hasError = true;
                continue;
            }
            data[name] = value;
        }

        if (hasError) {
            displayError('Please fix the highlighted fields before running the prediction.');
            return;
        }

        showLoading();

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                displaySuccess(result);
            } else {
                displayError(result.error || 'An unexpected error occurred.');
            }
        } catch (err) {
            console.error(err);
            displayError('Could not reach the server. Please try again.');
        } finally {
            hideLoading();
        }
    }

    function displaySuccess(result) {
        const val = result.prediction.toFixed(2);
        const f = result.features;

        const summaryRows = SUMMARY_ORDER.map(k =>
            `<div class="summary-row">
                <span>${LABELS[k] || k}</span>
                <span>${f[k]} ${UNITS[k] || ''}</span>
            </div>`
        ).join('');

        resultDiv.innerHTML = `
            <div class="result-success">
                <div class="status-label"><i class="fas fa-check-circle"></i> Prediction Complete</div>
                <div class="prediction-value">${val}</div>
                <div class="prediction-unit">Clinker Output (%)</div>
                <div class="input-summary">
                    <div class="summary-title">Input Summary</div>
                    <div class="summary-grid">${summaryRows}</div>
                </div>
            </div>
        `;
        resultDiv.style.borderColor = 'var(--success)';
        resultDiv.style.background = 'var(--success-bg)';
    }

    function displayError(msg) {
        resultDiv.innerHTML = `
            <div class="result-error">
                <div class="err-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <p>${msg}</p>
            </div>
        `;
        resultDiv.style.borderColor = 'var(--error)';
        resultDiv.style.background = 'var(--error-bg)';
    }

    function showLoading() {
        loadingOverlay.style.display = 'flex';
        form.style.pointerEvents = 'none';
        form.style.opacity = '0.5';
    }

    function hideLoading() {
        loadingOverlay.style.display = 'none';
        form.style.pointerEvents = 'auto';
        form.style.opacity = '1';
    }
});
