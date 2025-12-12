## 📄 MyShowRoomAI - Colab Backend Guide

This document provides detailed procedures for running the **MyShowRoomAI Backend (BE)** on Google Colab.

We recommend using **Google Colab** for AI models that require a GPU (SAM, SegFormer/BEiT) and for downloading 3D models that require high-speed networks.

-----

### 🛑 Notification of Google AI Studio Execution Environment Limitation (Critical)

> The backend of this project was developed in a **Monorepo structure** optimized for a GPU runtime (Colab) within a **code editor environment** to implement sophisticated AI features.
>
> Due to the environmental constraints of Google AI Studio and the **difference between the code editor and Studio environments**, including the complex Monorepo structure and limitations on adjusting specific file paths (e.g., $index.tsx$), **direct preview and execution within the Studio are not possible.** All functions work normally in the Colab/local environment following the guide below.

-----

### 🚀 Backend Execution Method (Google Colab)

#### 1\. Create Google Colab Notebook

  * Create a new notebook and set the runtime type to **GPU (T4 or higher)**.

#### 2\. Copy and Run Code

Add cells in the order below, and copy and run the contents of the respective files (`cell1.py` \~ `cell4.py`).

| Step | File | Description |
| :--- | :--- | :--- |
| **Cell 1** | `cell1.py` | **Environment Setup and Dependency Installation**: Installs essential libraries (`fastapi`, `uvicorn`, `torch`, etc.) and downloads the Segment Anything Model (SAM) weights. |
| **Cell 2** | `cell2.py` | **Dataset and 3D Model Preparation**: Downloads the `furniture_3d_only.json` metadata uploaded to GitHub, and downloads 3D models (`.glb`) from the Amazon Berkeley Objects dataset, saving them to Colab temporary storage. |
| **Cell 3** | `cell3.py` | **Server Code and AI Model Load**:<br>**[Important] API Key Setup**: You must set `GOOGLE_API_KEY` and `NGROK_AUTH_TOKEN`. Use Colab's 'Secret' feature or enter the keys directly in the `[TODO]` section at the top of the code. Initializes the FastAPI app and AI models (SAM, BEiT, Gemini). |
| **Cell 4** | `cell4.py` | **Server Execution (ngrok)**: Exposes the local server (port 8000) to an external URL via ngrok. Check the **🚀 Public URL**: `https://xxxx-xxxx.ngrok-free.app` displayed after execution. |

-----

### ⚠️ Frontend Connection Caution (Critical)

The ngrok URL changes every time the Colab instance runs.
**Once the server is running, you must perform the following steps:**

1.  Copy the **Public URL** from the Cell 4 execution result (e.g., `https://a1b2-34-56-78-90.ngrok-free.app`).
2.  Open the environment variable file of the local frontend project.
      * 📂 `fe/.env` (or `.env.local`)
3.  Change the `NEXT_PUBLIC_API_URL` value to the address you just copied.
    ```env
    # fe/.env
    NEXT_PUBLIC_API_URL=https://a1b2-34-56-78-90.ngrok-free.app
    ```
    *(Caution: Ensure there is no `/` at the end of the address)*
4.  It applies without restarting the frontend server, but restart if you are unsure.

-----

### 💡 Note

The free version of Colab may disconnect the runtime after a certain period of time.

-----

### 🌐 2. Run Frontend (fe)

Next.js-based user web interface.

1.  **Navigate to directory**

    ```bash
    cd fe
    ```

2.  **Install Packages and Start**

    ```bash
    npm install
    npm run build
    npm start
    ```

      * Access the frontend at `http://localhost:3000`.

-----

**Note**: The Backend server must be running first for the AI features to function correctly in the Frontend.