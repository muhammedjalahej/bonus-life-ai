# Insulyn AI - Type 2 Diabetes Early Detection Platform

An AI-powered platform for early detection and prevention of Type 2 Diabetes, combining machine learning prediction with personalized health guidance.

## Authors

- **Muhammed Jalahej**
- **Yazen Emino**

## Features

- **Diabetes Risk Prediction** – ML-based binary classification using clinical features (glucose, BMI, age, etc.)
- **AI Health Chatbot** – Conversational AI powered by Groq/LLM for personalized diabetes advice
- **Voice Chat** – Speech-to-text and text-to-speech interaction
- **Diet Plan Generator** – AI-generated personalized nutrition plans
- **Emergency Assessment** – Quick health risk evaluation
- **Explainable AI** – Feature importance and risk factor identification

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React, Material UI, Vite |
| **Backend** | FastAPI, Python |
| **ML Models** | scikit-learn, XGBoost |
| **LLM** | Groq API (LangChain) |
| **Data** | Pima Indians Diabetes Dataset (binary model), NHANES (notebook analysis) |

## Project Structure

```
├── app/
│   ├── backend/          # FastAPI backend
│   │   ├── app/          # Application code (routes, models, ML, LLM)
│   │   ├── data/         # Trained model (best_model.pkl)
│   │   └── .env          # Environment variables (API keys)
│   └── frontend/         # React frontend
│       └── insulyn-frontend/
│           └── src/      # React components, pages, services
├── Data/                 # Datasets (diabetes.csv, preprocessed)
├── Models/               # Saved models and training results
├── Notebooks/            # Jupyter notebook (EDA, model training)
├── scripts/              # Training scripts (train_model.py)
├── Images/               # Visualizations and plots
└── Presentation/         # Project presentation
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm

### Backend Setup

```bash
cd app/backend
pip install -r requirements.txt
```

Create a `.env` file in `app/backend/` with:

```
GROQ_API_KEY=your_groq_api_key_here
LLM_MODEL_NAME=llama3-8b-8192
LLM_TEMPERATURE=0.6
ENVIRONMENT=development
DEBUG=True
LOG_LEVEL=INFO
HOST=0.0.0.0
PORT=8000
RELOAD=True
```

Start the backend:

```bash
cd app/backend
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd app/frontend/insulyn-frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API calls to the backend on port 8000.

### Model Training

```bash
python scripts/train_model.py
```

This trains the diabetes prediction model on the Pima dataset and saves it to `app/backend/data/best_model.pkl`.

## License

Copyright (c) 2025 Muhammed Jalahej and Yazen Emino. All rights reserved.
