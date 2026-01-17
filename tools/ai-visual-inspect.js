/**
 * AI Visual Inspection Tool
 * Analyzes screenshots using Claude API for visual feedback
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

/**
 * Analyze a screenshot using Claude's vision capabilities
 * @param {string} imagePath - Path to the screenshot
 * @param {string} [context] - Additional context about what to check
 * @returns {Promise<object>} Analysis results
 */
async function analyzeScreenshot(imagePath, context = '') {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  const anthropic = new Anthropic({ apiKey });

  // Read and encode image
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mediaType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const systemPrompt = `You are a UI/UX quality assurance expert analyzing screenshots of a habit tracking PWA called YourScore.
Your task is to identify any visual issues, layout problems, accessibility concerns, or usability issues.

Analyze the screenshot and return a JSON response with:
{
  "status": "ok" | "issues_found",
  "issues": [
    {
      "type": "layout" | "color" | "typography" | "accessibility" | "usability" | "responsive",
      "severity": "low" | "medium" | "high",
      "description": "Description of the issue",
      "suggestion": "How to fix it"
    }
  ],
  "positives": ["List of things done well"],
  "summary": "Brief overall assessment"
}`;

  const userPrompt = context
    ? `Analyze this screenshot. Context: ${context}`
    : 'Analyze this screenshot for any UI/UX issues.';

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
      system: systemPrompt,
    });

    // Extract text content from response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent) {
      throw new Error('No text response from Claude');
    }

    // Parse JSON from response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        status: 'ok',
        issues: [],
        positives: [],
        summary: textContent.text,
        raw: textContent.text
      };
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error analyzing screenshot:', error.message);
    throw error;
  }
}

/**
 * Analyze multiple screenshots
 * @param {string[]} imagePaths - Paths to screenshots
 * @returns {Promise<object[]>} Analysis results for each image
 */
async function analyzeMultiple(imagePaths) {
  const results = [];

  for (const imagePath of imagePaths) {
    console.log(`Analyzing: ${imagePath}`);
    try {
      const result = await analyzeScreenshot(imagePath);
      results.push({ path: imagePath, ...result });
    } catch (error) {
      results.push({ path: imagePath, status: 'error', error: error.message });
    }
  }

  return results;
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node ai-visual-inspect.js <screenshot-path> [context]');
    console.log('       node ai-visual-inspect.js --dir <screenshots-directory>');
    process.exit(1);
  }

  try {
    if (args[0] === '--dir') {
      // Analyze all screenshots in directory
      const dir = args[1] || 'tests/visual/screenshots';
      const files = fs.readdirSync(dir)
        .filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
        .map(f => path.join(dir, f));

      if (files.length === 0) {
        console.log('No screenshots found in directory');
        process.exit(0);
      }

      const results = await analyzeMultiple(files);
      console.log('\n--- Analysis Results ---\n');
      console.log(JSON.stringify(results, null, 2));
    } else {
      // Analyze single screenshot
      const imagePath = args[0];
      const context = args[1] || '';

      if (!fs.existsSync(imagePath)) {
        console.error(`File not found: ${imagePath}`);
        process.exit(1);
      }

      const result = await analyzeScreenshot(imagePath, context);
      console.log('\n--- Analysis Result ---\n');
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('Analysis failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (process.argv[1].includes('ai-visual-inspect')) {
  main();
}

export { analyzeScreenshot, analyzeMultiple };
