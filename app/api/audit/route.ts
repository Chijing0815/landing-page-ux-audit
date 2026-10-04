import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Fetch the live webpage HTML so the AI actually analyzes it
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

    const prompt = `You are an expert UX and Conversion Rate Optimization (CRO) auditor. Analyze this HTML content from ${url} and provide a realistic evaluation.
    
    Return ONLY a valid JSON object with this exact structure, containing no markdown or extra text:
    {
      "overall_score": <number between 60 and 95>,
      "key_issues": ["Issue 1 specific to this site", "Issue 2 specific to this site", "Issue 3 specific to this site"],
      "recommendations": ["Recommendation 1 for this site", "Recommendation 2 for this site", "Recommendation 3 for this site"]
    }

    HTML Content snippet:
    ${truncatedHtml}`;

    // Using gemini-2.5-flash for stable, real-time AI generation
    const modelResponse: any = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let resultText = modelResponse?.text || '{}';
    // Strip any markdown blocks if the model includes them
    resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();

    const auditData = JSON.parse(resultText);
    return NextResponse.json(auditData);

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred during AI audit generation' },
      { status: 500 }
    );
  }
}