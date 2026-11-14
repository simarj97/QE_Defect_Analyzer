import { maskSecrets } from '../requirements/parser.js';

export class AIAdapter {
  constructor({ provider = process.env.AI_PROVIDER || 'local-rules', apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY, model = process.env.AI_MODEL } = {}) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.model = model || (provider === 'openai' ? 'gpt-4o' : 'claude-3-5-sonnet-20241022');
  }

  async generate(prompt, systemInstruction = '', schemaValidator = null) {
    // Redact any secrets before sending to any provider
    const safePrompt = maskSecrets(prompt);
    const safeSystem = maskSecrets(systemInstruction);

    if (this.provider === 'openai' && this.apiKey) {
      return this._callOpenAI(safePrompt, safeSystem, schemaValidator);
    } else if (this.provider === 'anthropic' && this.apiKey) {
      return this._callAnthropic(safePrompt, safeSystem, schemaValidator);
    } else {
      // Default / Built-in Domain Rule AI Engine
      return this._generateDomainRuleContent(safePrompt, schemaValidator);
    }
  }

  async _callOpenAI(prompt, system, validator) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: `${system}\nReturn strictly valid JSON matching the schema.` },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${err}`);
    }

    const json = await response.json();
    const parsed = JSON.parse(json.choices[0].message.content);
    return validator ? validator.parse(parsed) : parsed;
  }

  async _callAnthropic(prompt, system, validator) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        system: `${system}\nReturn strictly valid JSON only.`,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${err}`);
    }

    const json = await response.json();
    const content = json.content[0].text;
    const cleanJson = content.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleanJson);
    return validator ? validator.parse(parsed) : parsed;
  }

  _generateDomainRuleContent(prompt, validator) {
    // Built-in intelligent rule-based synthesizer based on context
    // The generator.js handles structured construction for each QA artifact type
    return null;
  }
}
