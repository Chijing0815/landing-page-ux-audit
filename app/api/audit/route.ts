import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

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

    // Trying the model call directly without fallback so we can see the exact error if it fails
    const modelResponse: any = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const resultText = modelResponse?.text || '{}';
    const auditData = JSON.parse(resultText);
    return NextResponse.json(auditData);

  } catch (error: any) {
    // This will now pass the exact error message to your UI so you can see what's going wrong
    return NextResponse.json(
      { error: `API Error: ${error.message || JSON.stringify(error)}` },
      { status: 500 }
    );
  }
}