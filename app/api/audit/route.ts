import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch page: ${response.statusText}` },
        { status: 400 }
      );
    }

    const html = await response.text();
    const cleanHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .slice(0, 8000);

    const prompt = `You are an expert UX and conversion rate optimization (CRO) consultant. Analyze the following landing page HTML content and return a JSON response with:
1. "score" (number from 0 to 100)
2. "summary" (brief high-level feedback)
3. "strengths" (array of strings)
4. "improvements" (array of strings with actionable CRO fixes)

Landing Page Content:
${cleanHtml}`;

    const modelResponse = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const resultText = modelResponse.text || '{}';
    const auditData = JSON.parse(resultText);

    return NextResponse.json(auditData);
  } catch (error: any) {
    console.error('Audit handler error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during audit' },
      { status: 500 }
    );
  }
}