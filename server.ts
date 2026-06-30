import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Helper to parse Base64 data URL
function parseBase64Image(dataUrl: string) {
  if (!dataUrl.includes(";base64,")) {
    throw new Error("Invalid image format. Expected Base64 data URL.");
  }
  const parts = dataUrl.split(";base64,");
  const mimeType = parts[0].replace("data:", "");
  const data = parts[1];
  return { mimeType, data };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add middleware to parse JSON bodies with a 15mb limit for Base64 image payloads
  app.use(express.json({ limit: "15mb" }));

  // Helper to get Gemini client or throw descriptive error
  function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined. Please configure it in your AI Studio Secrets panel.");
    }
    return new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // API Route: Analyze Civic Issue
  app.post("/api/gemini/analyze-issue", async (req, res) => {
    try {
      const { imageBase64, userDescription } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "imageBase64 is required" });
      }

      const ai = getGeminiClient();
      const { mimeType, data } = parseBase64Image(imageBase64);

      const prompt = `Analyze the uploaded image representing a community infrastructure/civic issue.
The citizen provided this description: "${userDescription || 'No description provided.'}"

Based on the image and description, classify the issue.
You must return a JSON object with the following structure:
{
  "category": "pothole" | "water_leakage" | "damaged_streetlight" | "waste_management" | "public_infra_damage" | "other",
  "suggested_department": "Public Works Department (PWD / Roads)" | "Water Supply & Sanitation Board" | "Electricity Board (Urban Lighting)" | "Municipal Waste Management" | "Urban Planning & Infrastructure",
  "severity": "low" | "medium" | "high",
  "summary": "A concise 4-6 word headline summarizing the issue (e.g., 'Large pothole on main road')",
  "details": "A brief 2-sentence summary explaining the extent of the damage visible in the image."
}

Ensure your classification maps accurately to these options:
- Potholes, road cracks, broken pavement -> "pothole" -> "Public Works Department (PWD / Roads)"
- Burst pipes, street flooding, open sewers, leaking hydrants -> "water_leakage" -> "Water Supply & Sanitation Board"
- Broken streetlights, hanging electrical wires -> "damaged_streetlight" -> "Electricity Board (Urban Lighting)"
- Piles of garbage, overflowing bins, open dumps -> "waste_management" -> "Municipal Waste Management"
- Damaged park benches, broken fences, damaged bridges, public school walls -> "public_infra_damage" -> "Urban Planning & Infrastructure"`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: mimeType,
              data: data,
            },
          },
          prompt,
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      if (!response.text) {
        throw new Error("No response received from Gemini.");
      }

      const result = JSON.parse(response.text);
      res.json(result);
    } catch (error: any) {
      console.error("Error in analyze-issue:", error);
      res.status(500).json({ error: error.message || "Failed to analyze issue" });
    }
  });

  // API Route: Verify Repair Resolution
  app.post("/api/gemini/verify-resolution", async (req, res) => {
    try {
      const { beforeImageBase64, afterImageBase64, officerNotes } = req.body;
      if (!beforeImageBase64 || !afterImageBase64) {
        return res.status(400).json({ error: "Both before and after image parameters are required" });
      }

      const ai = getGeminiClient();
      const before = parseBase64Image(beforeImageBase64);
      const after = parseBase64Image(afterImageBase64);

      const prompt = `You are a municipal audit assistant. Compare these two images:
Image 1 is the "BEFORE" photo showing a reported civic issue.
Image 2 is the "AFTER" photo showing the repair work uploaded by a municipal officer.
The officer notes: "${officerNotes || 'No notes provided.'}"

Determine if the civic issue shown in the "BEFORE" photo has been successfully resolved/fixed/cleaned in the "AFTER" photo.
You must return a JSON object with the following structure:
{
  "is_resolved": true | false,
  "confidence": number (float between 0.0 and 1.0 representing how confident you are in your decision),
  "verification_summary": "A detailed 1-2 sentence explanation of your audit (e.g., 'The pothole has been fully filled and paved with fresh asphalt, matching the surrounding road.')"
}

Be thorough and prevent officers from uploading unrelated photos or leaving issues half-resolved.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: before.mimeType,
              data: before.data,
            },
          },
          {
            inlineData: {
              mimeType: after.mimeType,
              data: after.data,
            },
          },
          prompt,
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      if (!response.text) {
        throw new Error("No response received from Gemini.");
      }

      const result = JSON.parse(response.text);
      res.json(result);
    } catch (error: any) {
      console.error("Error in verify-resolution:", error);
      res.status(500).json({ error: error.message || "Failed to verify resolution" });
    }
  });

  // API Route: AI Concierge Chat
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "messages array is required" });
      }

      const ai = getGeminiClient();

      const systemInstruction = `You are the 'Civic Concierge Agent' for Community Hero.
The user is talking to you inside their hyperlocal civic social platform.
Answer their questions about reporting infrastructure issues (potholes, water leaks, streetlights, garbage), geohashing, upvotes, or how the officer verification audits work.
Provide a helpful, polite, and encouraging response in 1-3 sentences.
If they want to report an issue, tell them to tap the '+' card or click the "Report Civic Issue" button.
Keep responses concise, warm, and professional.`;

      const contents = messages.map((m: any) => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction,
        }
      });

      res.json({ text: response.text || "I'm sorry, I couldn't process that response." });
    } catch (error: any) {
      console.error("Error in chat:", error);
      res.status(500).json({ error: error.message || "Failed to generate chat response" });
    }
  });

  // API Route: Moderate / Validate comment relevance (prevent gossip/spam)
  app.post("/api/gemini/validate-comment", async (req, res) => {
    try {
      const { postTitle, postDescription, commentText } = req.body;
      if (!commentText) {
        return res.status(400).json({ error: "commentText is required" });
      }

      const ai = getGeminiClient();

      const prompt = `You are a helpful, strict, and polite automated Civic Moderator for a hyperlocal community social platform.
Your task is to analyze a proposed user comment on a reported civic infrastructure issue. You must decide if the comment is RELEVANT, CONSTRUCTIVE, and RELATED to the issue itself (e.g., providing updates, asking questions, offering help, stating observations, sharing experiences with the damage), or if it is completely UNRELATED, GOSSIP, SPAM, or chit-chat.

Civic Issue Reported: "${postTitle || 'Civic infrastructure complaint'}"
Issue Description: "${postDescription || 'No details provided.'}"

Proposed Comment to evaluate: "${commentText}"

Analyze the comment carefully. Reject comments that:
- Discuss personal gossip, rumors, or unrelated people (e.g., "Aisha's party was so fun", "Did you hear about what he said?")
- Have nothing to do with the civic issue, local infrastructure, or municipal repairs.
- Contain aggressive insults, social media drama, or spam advertisements.
- Are simple unrelated chit-chat (e.g. "I'm selling custom watches", "Who is going to the mall?").

Accept comments that:
- Express support or concern about the issue (e.g., "This pothole has damaged two cars this week", "Thanks for reporting, hope it gets fixed soon").
- Ask constructive questions or give helpful updates (e.g., "Is the water still leaking?", "I saw workers there this morning").

You must return a JSON object with this exact structure:
{
  "is_related": true | false,
  "reason": "A friendly, polite 1-sentence message explaining why the comment was rejected if is_related is false (e.g., 'Please keep comments focused on this pothole issue. Unrelated gossip is moderated to keep our platform constructive.'), or a short approval reason if true."
}

Ensure the output is valid JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      if (!response.text) {
        throw new Error("No response received from Gemini.");
      }

      const result = JSON.parse(response.text);
      res.json(result);
    } catch (error: any) {
      console.error("Error in validate-comment:", error);
      res.status(500).json({ error: error.message || "Failed to validate comment" });
    }
  });

  // Serve static assets in production or use Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
