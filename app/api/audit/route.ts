import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // 1. Fetch page HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch target URL: ${response.statusText}` },
        { status: response.status }
      );
    }

    const html = await response.text();
    const truncatedHtml = html.substring(0, 15000);

    const prompt = `Analyze this landing page HTML for UX and CRO improvements. Return JSON with overall_score (0-100), key_issues (array of strings), and recommendations (array of strings):\n\n${truncatedHtml}`;

    // 2. AI Model Call with Auto-Retry for 503 capacity errors
    let modelResponse: any;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        modelResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });
        break; 
      } catch (err: any) {
        if (attempts >= maxAttempts) throw err;
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    // Safely extract text string from response object
    const resultText = modelResponse?.text || '{}';
    const auditData = JSON.parse(resultText);

    return NextResponse.json(auditData);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred during audit' },
      { status: 500 }
    );
  }
}