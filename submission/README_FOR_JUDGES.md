# 🏆 Hackathon Submission Preparation Guide

This guide explains how to prepare your **MyShowRoom AI** project for submission, ensuring that judges can run your Colab notebook without needing access to your private files.

## 1. Host Metadata on GitHub
The backend needs `furniture_3d_only.json` to know which furniture items exist. Since judges can't access your Google Drive, we will host this file on your GitHub repository.

1.  Locate `furniture_3d_only.json` on your computer.
2.  Upload it to your GitHub repository (e.g., `MyShowRoomAI/BE/furniture_3d_only.json`).
3.  Once uploaded, click on the file in GitHub.
4.  Click the **"Raw"** button.
5.  **Copy the URL** of the raw file. It should look like:
    `https://raw.githubusercontent.com/YourUsername/RepoName/main/BE/furniture_3d_only.json`

## 2. Prepare the Colab Notebook
We have prepared a single, merged code block (`colab_submission_code.md`) for you.

1.  Open a new Google Colab notebook (or clear your existing one).
2.  Copy the code from `colab_submission_code.md`.
3.  **Find "TODO" in Cell 2** and paste your **Raw GitHub URL** there.
    ```python
    # Example
    !wget -q https://raw.githubusercontent.com/youngmin/MyShowRoomAI/main/BE/furniture_3d_only.json -O furniture_3d_only.json
    ```

## 3. Handle API Keys (Security vs. Convenience)
For hackathons, you want the judges to have a smooth experience.

*   **Option A (Recommended):** Create a **Demonstration Google Account** and generate a new Gemini API Key. Hardcode this key into the notebook (or use Colab Secrets and provide the key in the submission text). This ensures it "just works" for them.
*   **Option B (Secure):** Leave the code as `userdata.get('GOOGLE_API_KEY')` and instruct judges to enter their own key. *Warning: Judges might be lazy or not have a key ready.*

## 4. Final Verification
1.  Open an **Incognito Window**.
2.  Log in with a different Google account (if possible).
3.  Open your Colab notebook link (ensure Sharing is set to **"Anyone with the link"** -> **"Viewer"**).
4.  Click **Runtime -> Run all**.
5.  If it starts the server and prints a Public URL without asking for drive access, you are ready to submit! 🎉
