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
    // Keep it concise so large pages like Stripe process smoothly
    const truncatedHtml = html.substring(0, 10000);

    const prompt = `You are a strict, objective UX and CRO expert. Analyze this webpage HTML from ${url} and return a JSON object with:
    - "overall_score": a realistic number between 50 and 95 based on the code quality and layout cues.
    - "key_issues": an array of 3 specific issues found in this page.
    - "recommendations": an array of 3 actionable fixes for this specific page.

    HTML Content:
    ${truncatedHtml}`;

    let resultText = '';
    // Only use the working flash models to avoid 404 model errors
    const modelsToTry = ['gemini-3.8-flash', 'gemini-1.5-flash'];
    let success = false;
    let lastError = '';

    for (const modelName of modelsToTry) {
      try {
        const modelResponse: any = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });
        resultText = modelResponse?.text || '';
        if (resultText) {
          success = true;
          break;
        }
      } catch (err: any) {
        lastError = err?.message || JSON.stringify(err);
      }
    }

    if (!success) {
      throw new Error(`Audit generation failed: ${lastError}`);
    }

    const auditData = JSON.parse(resultText);
    return NextResponse.json(auditData);

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred during audit' },
      { status: 500 }
    );
  }
}