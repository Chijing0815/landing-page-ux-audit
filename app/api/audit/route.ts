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
    const truncatedHtml = html.substring(0, 8000);

    const prompt = `You are a strict, objective UX and CRO expert. Analyze this webpage HTML from ${url} and return ONLY a valid JSON object with no markdown formatting, structured exactly like this:
    {
      "overall_score": <number between 55 and 95 based on this specific page>,
      "key_issues": ["issue 1", "issue 2", "issue 3"],
      "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
    }

    HTML Content:
    ${truncatedHtml}`;

    // Using the exact model string the SDK expects
    const modelResponse: any = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    let resultText = modelResponse?.text || '{}';
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