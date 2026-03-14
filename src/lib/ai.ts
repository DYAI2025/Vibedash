export type AIProvider = 'gemini-3.1-pro' | 'gemini-3.1-flash-lite' | 'gpt-5.4' | 'claude-opus-4.6' | 'claude-sonnet-4.6';

export async function generateProjectInsights(context: string, prompt: string, provider: AIProvider = 'gemini-3.1-pro') {
  try {
    const openaiKey = localStorage.getItem('nexus_openai_key') || undefined;
    const anthropicKey = localStorage.getItem('nexus_anthropic_key') || undefined;

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider,
        context,
        message: prompt,
        openaiKey,
        anthropicKey
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Error generating insights:", error);
    throw error;
  }
}

export async function generateDevelopmentOrders(pgdContent: string, specContent: string, provider: AIProvider = 'gemini-3.1-pro') {
  try {
    const openaiKey = localStorage.getItem('nexus_openai_key') || undefined;
    const anthropicKey = localStorage.getItem('nexus_anthropic_key') || undefined;

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider,
        context: "PGD and SPEC context",
        systemPrompt: "You are an expert technical project manager and software architect. Your task is to analyze the provided Product Goal Document (PGD) and Technical Specification (SPEC) to break down the project into actionable development orders (tasks). Return the result strictly as a JSON array of objects, where each object has 'title' and 'description' properties. Do not include any markdown formatting or extra text outside the JSON array.",
        message: `PGD:\n${pgdContent}\n\nSPEC:\n${specContent}`,
        openaiKey,
        anthropicKey
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    const data = await response.json();
    let text = data.text.trim();
    if (text.startsWith('```json')) {
      text = text.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (text.startsWith('```')) {
      text = text.replace(/^```/, '').replace(/```$/, '').trim();
    }
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating development orders:", error);
    throw error;
  }
}
export async function summarizeDataChanges(oldData: string, newData: string, provider: AIProvider = 'gemini-3.1-pro') {
  try {
    const openaiKey = localStorage.getItem('nexus_openai_key') || undefined;
    const anthropicKey = localStorage.getItem('nexus_anthropic_key') || undefined;

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider,
        context: "You are a data analyst. Compare the following two versions of project data and summarize the key changes, structural updates, and potential impacts.",
        message: `Old Data:\n${oldData}\n\nNew Data:\n${newData}`,
        openaiKey,
        anthropicKey
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Error summarizing changes:", error);
    throw error;
  }
}
