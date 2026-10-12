// API service for EquiRisk backend communication with graceful fallbacks

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Backend health check failed, utilizing localized inference fallback:", err);
    return { status: "offline", fallback: true };
  }
}

export async function predictRisk(features) {
  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features)
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("API call /predict failed:", err);
    throw err;
  }
}

export async function getExplanation(features, predictionId = null) {
  try {
    if (predictionId) {
      const res = await fetch(`${API_BASE}/explain/${predictionId}`);
      if (res.ok) return await res.json();
    }
    const res = await fetch(`${API_BASE}/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features)
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("API call /explain failed:", err);
    throw err;
  }
}

export async function getPopulationInsights() {
  try {
    const res = await fetch(`${API_BASE}/insights`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("API call /insights failed:", err);
    throw err;
  }
}

export async function getFairnessAudit() {
  try {
    const res = await fetch(`${API_BASE}/fairness`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("API call /fairness failed:", err);
    throw err;
  }
}

export async function getSamplePersona(persona) {
  try {
    const res = await fetch(`${API_BASE}/sample/${persona}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`API call /sample/${persona} failed:`, err);
    throw err;
  }
}

export async function batchPredict(csvFile) {
  try {
    const formData = new FormData();
    formData.append('file', csvFile);
    const res = await fetch(`${API_BASE}/predict/batch`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      if (res.status === 413) {
        throw new Error('File too large. Maximum 5,000 rows allowed.');
      }
      if (errorData && errorData.detail) {
        throw new Error(errorData.detail);
      }
      throw new Error(`HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('API call /predict/batch failed:', err);
    throw err;
  }
}
