# Scripture Voice AI

**Scripture Voice** is an AI-powered Bible Podcast application. It transforms standard scripture reading into an immersive auditory experience by combining Generative AI search, Contextual Understanding, Text-to-Speech (TTS), and Image Generation.

![Version](https://img.shields.io/badge/version-2.2.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🌟 Features

*   **AI-Powered Search:** Uses Google Gemini 2.5 Flash to find verses based on natural language (e.g., "comfort for anxiety") and generates deep devotional context.
*   **Natural Voice TTS:** Streaming Text-to-Speech using Gemini's advanced voices (Fenrir, Kore, etc.).
*   **Visual Immersion:** Generates oil-painting style biblical imagery using Imagen 4.0.
*   **Bilingual Support:** Full support for English (NIV/ESV style) and Traditional Chinese (CUV).
*   **Smart Caching:** Implements a 4-layer caching strategy (Browser IndexedDB -> Server RAM -> Server Disk -> API) to minimize costs and latency.

## 🏗 Architecture

This project utilizes a **Monolithic Architecture** deployed on a single container (e.g., Google Cloud Run).

1.  **Frontend (Client):** Built with React, TypeScript, and Tailwind CSS.
2.  **Backend (Server):** A Node.js/Express server that acts as an API Gateway and Static File Server.
3.  **Data Path:**
    *   User requests a passage.
    *   Server checks RAM Cache (`node-cache`).
    *   Server checks Disk Cache (JSON files).
    *   If missing, Server calls Google Gemini API.
    *   Result is streamed back and cached at all layers.

## 🚀 Getting Started

### Prerequisites

*   Node.js 18+
*   A Google Gemini API Key

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/Shengliang/aistudio.git
    cd aistudio
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Create a `.env` file in the root directory:
    ```env
    API_KEY=your_google_gemini_api_key_here
    ```

4.  Run locally:
    ```bash
    npm run dev
    ```

## ☁️ Deployment (Google Cloud Run)

This project is optimized for Cloud Run.

1.  **Procfile** is included to ensure the correct startup command.
2.  **Engines** are defined in `package.json`.

```bash
gcloud run deploy scripture-voice --source .
```

## 🤝 Contributing

1.  Fork the project.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📄 License

Distributed under the MIT License.
