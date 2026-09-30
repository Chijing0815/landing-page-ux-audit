import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { GoogleGenAI } from '@google/genai';

// Configure route timeout limit for Vercel Serverless
export const maxDuration = 60; // Max duration 60 seconds

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export async function POST(req: NextRequest) {
  let browser;
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }

    // 1. Scrape Page Data
    const isLocal = process.env.NODE_ENV === 'development';

    browser = await puppeteer.launch({
      args: isLocal ? [] : chromium.args,
      defaultViewport: { width: 1280, height: 800 },
      executablePath: isLocal
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

    const extracted = await page.evaluate(() => {
      const clean = (s: string | null) => s?.replace(/\s+/g, ' ').trim() || '';

      const h1Elements = Array.from(document.querySelectorAll('h1'));
      const ctaElements = Array.from(document.querySelectorAll('a, button'));
      const pElements = Array.from(document.querySelectorAll('p'));

      return {
        metaTitle: document.title,
        h1s: h1Elements.map((el) => clean((el as HTMLElement).innerText)),
        ctas: ctaElements
          .map((el) => clean((el as HTMLElement).innerText))
          .filter((t) => t.length > 0 && t.length < 40)
          .slice(0, 8),
        paragraphs: pElements
          .map((el) => clean((el as HTMLElement).innerText))
          .filter((t) => t.length > 20)
          .slice(0, 5),
      };
    });

    await browser.close();

    // 2. Analyze with Gemini AI
    const prompt = `Analyze this landing page context for conversion flaws:
Title: ${extracted.metaTitle}
H1 Headlines: ${JSON.stringify(extracted.h1s)}
CTAs: ${JSON.stringify(extracted.ctas)}
Paragraph Samples: ${JSON.stringify(extracted.paragraphs)}

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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        systemInstruction: 'You are a strict CRO/UX auditor. Return ONLY valid JSON.',
      },
    });

    const textContent = response.text || '';
    const auditData = JSON.parse(textContent);

    return NextResponse.json({ success: true, url: targetUrl, audit: auditData });
  } catch (error: any) {
    if (browser) await browser.close();
    console.error('Audit Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to audit page' },
      { status: 500 }
    );
  }
}