import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { provider, context, message, openaiKey, anthropicKey, systemPrompt: customSystemPrompt } = req.body;

      if (!context && !message) {
        return res.status(400).json({ error: "Context or message is required" });
      }

      const systemPrompt = customSystemPrompt || `You are Nexus AI, a project awareness assistant. You have access to the following aggregated context from the user's project data sources. Use this context to answer the user's questions accurately. If the answer is not in the context, say so.\n\nContext:\n${context}`;

      let responseText = "";

      if (provider === "gemini-3.1-pro" || provider === "gemini-3.1-flash-lite") {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const modelName = provider === "gemini-3.1-pro" ? "gemini-3.1-pro-preview" : "gemini-3.1-flash-lite-preview";
        const response = await ai.models.generateContent({
          model: modelName,
          contents: message,
          config: {
            systemInstruction: systemPrompt,
          },
        });
        responseText = response.text || "";
      } else if (provider === "gpt-5.4") {
        const apiKey = openaiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error("OpenAI API key is missing. Please configure it in the Insights settings.");
        
        const openai = new OpenAI({ apiKey });
        const response = await openai.chat.completions.create({
          model: "gpt-4o", // Using gpt-4o as fallback since gpt-5.4 doesn't exist in the SDK yet
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ],
        });
        responseText = response.choices[0]?.message?.content || "";
      } else if (provider === "claude-opus-4.6" || provider === "claude-sonnet-4.6") {
        const apiKey = anthropicKey || process.env.ANTHROPIC_API_KEY;
        if (!apiKey) throw new Error("Anthropic API key is missing. Please configure it in the Insights settings.");
        
        const modelName = provider === "claude-opus-4.6" ? "claude-3-opus-20240229" : "claude-3-7-sonnet-20250219"; // Fallback to existing models
        const anthropic = new Anthropic({ apiKey });
        const response = await anthropic.messages.create({
          model: modelName,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [
            { role: "user", content: message }
          ],
        });
        // @ts-ignore
        responseText = response.content[0]?.text || "";
      } else {
        return res.status(400).json({ error: "Invalid provider selected" });
      }

      res.json({ text: responseText });
    } catch (error: any) {
      console.error("Chat API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred while generating the response" });
    }
  });

  // GitHub OAuth Routes
  app.get('/api/auth/github/url', (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: 'GITHUB_CLIENT_ID is not configured' });
    }
    
    // Use the origin from the request or the APP_URL
    const host = req.get('host');
    const protocol = req.protocol || 'https';
    const redirectUri = `${protocol}://${host}/auth/github/callback`;
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'repo read:user',
    });
    
    res.json({ url: `https://github.com/login/oauth/authorize?${params}` });
  });

  app.get(['/auth/github/callback', '/auth/github/callback/'], async (req, res) => {
    const { code } = req.query;
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    
    if (!code || typeof code !== 'string') {
      return res.status(400).send('Missing code parameter');
    }
    
    try {
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code
        })
      });
      
      const tokenData = await tokenResponse.json();
      
      if (tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error);
      }
      
      const accessToken = tokenData.access_token;
      
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GITHUB_AUTH_SUCCESS', token: '${accessToken}' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error('GitHub OAuth Error:', error);
      res.status(500).send(`Authentication failed: ${error.message}`);
    }
  });

  // Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
