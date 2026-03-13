export type AIProvider = 'google' | 'openai' | 'anthropic';

export async function generateProjectInsights(context: string, prompt: string, provider: AIProvider = 'google') {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider,
        context,
        message: prompt
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

export async function summarizeDataChanges(oldData: string, newData: string, provider: AIProvider = 'google') {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider,
        context: "You are a data analyst. Compare the following two versions of project data and summarize the key changes, structural updates, and potential impacts.",
        message: `Old Data:\n${oldData}\n\nNew Data:\n${newData}`
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
