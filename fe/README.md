# MyShowRoomAI Frontend

**MyShowRoomAI** is an AI-powered VR interior design assistant that transforms your empty spaces into fully furnished showrooms.

## Key Features
- **360° Panorama Support**: Upload your room's panorama image to enter a virtual showroom.
- **AI-Driven Recommendations**: Our AI analyzes your room structure and suggests the perfect furniture.
- **Realistic 3D Placement**: Place furniture models on a virtual floor with accurate perspective and lighting.
- **Interactive Editing**: Move, rotate, or remove items to customize your space freely.

---

## How to Run

To ensure the application runs correctly with the configured proxy settings (essential for avoiding CORS issues with the backend), please follow these steps:

### 1. Install Dependencies
If you haven't installed the dependencies yet, run:

```bash
npm install
```

### 2. Build and Start (Recommended)
**Important:** You must build the project and start the production server for the proxy settings in `next.config.ts` to work reliably in a production-like environment.

1.  **Build the application:**
    ```bash
    npm run build
    ```

2.  **Start the server:**
    ```bash
    npm start
    ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

### Development Mode
For development purposes, you can use the dev server:

```bash
npm run dev
```
