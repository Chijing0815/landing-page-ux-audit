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
    const truncatedHtml = html.substring(0, 12000);

    const prompt = `You are a strict, objective UX and CRO (Conversion Rate Optimization) expert. Analyze the following webpage HTML snippet from ${url}. 
    Provide a realistic, unique score between 55 and 98 based strictly on its actual structure. Do not output generic answers.
    Return ONLY a valid JSON object with this exact structure:
    {
      "overall_score": <number between 55-98>,
      "key_issues": [<array of 3 distinct, specific issues found in the HTML>],
      "recommendations": [<array of 3 distinct, specific, actionable recommendations>]
    }`;

    const modelResponse: any = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const resultText = modelResponse?.text || '{}';
    const auditData = JSON.parse(resultText);
    return NextResponse.json(auditData);

  } catch (error: any) {
    return NextResponse.json(
      { error: `Live Audit Error: ${error.message || 'Check API key or network connection.'}` },
      { status: 500 }
    );
  }
}