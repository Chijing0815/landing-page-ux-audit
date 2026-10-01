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
    const truncatedHtml = html.substring(0, 10000);

    const prompt = `You are a strict, objective UX and CRO expert. Analyze this webpage HTML from ${url} and return ONLY a valid JSON object with no markdown formatting, structured exactly like this:
    {
      "overall_score": 85,
      "key_issues": ["Issue 1 here", "Issue 2 here", "Issue 3 here"],
      "recommendations": ["Fix 1 here", "Fix 2 here", "Fix 3 here"]
    }

    HTML Content:
    ${truncatedHtml}`;

    // Let's use the standard flash model string directly
    const modelResponse: any = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let resultText = modelResponse?.text || '{}';
    // Clean up any markdown code blocks if the model includes them
    resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();

    const auditData = JSON.parse(resultText);
    return NextResponse.json(auditData);

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred during audit' },
      { status: 500 }
    );
  }
}