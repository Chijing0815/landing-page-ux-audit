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
    // Simple HTML content truncation to fit within model prompt context
    const truncatedHtml = html.substring(0, 15000);

    const prompt = `Analyze this landing page HTML for UX and CRO improvements. Return JSON with overall_score (0-100), key_issues (array of strings), and recommendations (array of strings):\n\n${truncatedHtml}`;

    // 2. Execute AI Model Call with Fallback for 503 capacity issues
    let modelResponse;
    try {
      modelResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
    } catch (err: any) {
      // Fallback to gemini-1.5-flash if primary model experiences high demand
      modelResponse = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
    }

    const resultText = modelResponse.text;
    const auditData = JSON.parse(resultText || '{}');

    return NextResponse.json(auditData);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred during audit' },
      { status: 500 }
    );
  }
}