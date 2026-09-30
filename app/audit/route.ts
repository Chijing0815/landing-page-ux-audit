import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
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

    // 1. Scrape Page Data
    const isLocal = process.env.NODE_ENV === 'development';
    const browser = await puppeteer.launch({
      args: isLocal ? [] : chromium.args,
      defaultViewport: { width: 1280, height: 800 },
      executablePath: isLocal
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

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

    // 2. Analyze with Claude AI
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      system: 'You are a strict CRO/UX auditor. Return ONLY valid JSON.',
      messages: [
        {
          role: 'user',
          content: `Analyze this landing page context for conversion flaws:
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
          }`,
        },
      ],
    });

    const textContent = response.content[0].type === 'text' ? response.content[0].text : '';
    const auditData = JSON.parse(textContent);

    return NextResponse.json({ success: true, url: targetUrl, audit: auditData });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Failed to audit page' }, { status: 500 });
  }
}