import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60;

// Initialize SDK instance
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

    // 1. Scrape Page Content using Fetch
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

    // Clean HTML to extract title, headings, buttons, and paragraphs
    const metaTitle = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '';
    
    const extractTags = (tag: string) => {
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'gi');
      const matches: string[] = [];
      let match;
      while ((match = regex.exec(html)) !== null) {
        const text = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (text) matches.push(text);
      }
      return matches;
    };

    const h1s = extractTags('h1');
    const ctas = [...extractTags('button'), ...extractTags('a')]
      .filter((t) => t.length > 0 && t.length < 40)
      .slice(0, 10);
    const paragraphs = extractTags('p')
      .filter((t) => t.length > 20)
      .slice(0, 5);

    // 2. Analyze with Gemini AI
    const prompt = `Analyze this landing page context for conversion flaws:
Title: ${metaTitle}
H1 Headlines: ${JSON.stringify(h1s)}
CTAs: ${JSON.stringify(ctas)}
Paragraph Samples: ${JSON.stringify(paragraphs)}

Return strictly valid JSON with this shape:
{
  "overallScore": 75,
  "headlineClarity": 70,
  "ctaScore": 80,
  "summary": "Short overview of page quality.",
  "fixes": [
    { "issue": "Problem", "recommendation": "Solution", "suggestedCopy": "New Text" }
  ]
}`;

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-2.0-flash', // Updated to stable flash model
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        systemInstruction: 'You are a strict CRO/UX auditor. Return ONLY valid JSON.',
      },
    });

    const rawText = aiResponse.text || '';
    
    // Clean potential markdown fences before parsing
    const cleanedText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const auditData = JSON.parse(cleanedText);

    return NextResponse.json({ success: true, url: targetUrl, audit: auditData });
  } catch (error: any) {
    console.error('Audit Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to audit page' },
      { status: 500 }
    );
  }
}