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

export async function uploadMedicalReport(file, onProgress = null) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/extract-report`);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          resolve(json);
        } catch (e) {
          reject(new Error("Invalid response format from server."));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData.detail || `Upload failed with HTTP ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with HTTP ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network connection error while uploading medical report. Please verify backend is running on port 8000."));
    };

    xhr.send(formData);
  });
}

export async function fetchSampleReport(reportKey) {
  const res = await fetch(`${API_BASE}/sample-report/${reportKey}`);
  if (!res.ok) throw new Error(`Failed to load sample report: ${res.statusText}`);
  const blob = await res.blob();
  const ext = reportKey === 'scanned' ? 'png' : 'pdf';
  const mime = reportKey === 'scanned' ? 'image/png' : 'application/pdf';
  return new File([blob], `sample_${reportKey}_report.${ext}`, { type: mime });
}

export async function sendChatMessage(query, conversationHistory = [], k = 4, minScore = 0.38) {
  try {
    const sanitizedHistory = (conversationHistory || []).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content || ''
    }));

    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        conversation_history: sanitizedHistory,
        k,
        min_score: minScore
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.detail || `HTTP error ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.warn("API call /chat failed:", err);
    throw err;
  }
}
