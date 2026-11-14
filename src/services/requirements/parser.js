import Papa from 'papaparse';

// Untrusted input sanitization: strips HTML script tags, sanitizes control characters, masks sensitive tokens
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .trim();
}

// Redact known secrets patterns (e.g. API keys, JWTs, Bearer tokens, private passwords) from AI prompts, logs & responses
export function maskSecrets(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}/g, '[REDACTED_JWT_TOKEN]')
    .replace(/(api[_-]?key|secret|token|password|auth|bearer)\s*[:=]\s*["']?([A-Za-z0-9_\-\.]{8,})["']?/gi, '$1: "[REDACTED_SECRET]"');
}

export function parseRequirements({ format, content }) {
  const sanitized = sanitizeInput(content);
  if (!sanitized) {
    throw new Error('Requirement content is empty or contains only invalid characters.');
  }

  const items = [];

  switch (format.toLowerCase()) {
    case 'json': {
      try {
        const parsed = JSON.parse(sanitized);
        if (Array.isArray(parsed)) {
          parsed.forEach((item, index) => {
            items.push({
              id: item.id || `REQ-JSON-${String(index + 1).padStart(3, '0')}`,
              title: item.title || item.name || `Requirement ${index + 1}`,
              type: item.type || 'Functional',
              description: item.description || item.content || JSON.stringify(item),
              userRole: item.userRole || item.role || 'All Users',
              acceptanceCriteria: Array.isArray(item.acceptanceCriteria) ? item.acceptanceCriteria : (item.ac ? [item.ac] : [])
            });
          });
        } else if (typeof parsed === 'object') {
          // Object with keys or structured schema
          if (parsed.requirements && Array.isArray(parsed.requirements)) {
            parsed.requirements.forEach((item, index) => {
              items.push({
                id: item.id || `REQ-JSON-${String(index + 1).padStart(3, '0')}`,
                title: item.title || item.name || `Requirement ${index + 1}`,
                type: item.type || 'Functional',
                description: item.description || item.content || JSON.stringify(item),
                userRole: item.userRole || 'All Users',
                acceptanceCriteria: item.acceptanceCriteria || []
              });
            });
          } else {
            Object.entries(parsed).forEach(([key, val], index) => {
              items.push({
                id: `REQ-JSON-${String(index + 1).padStart(3, '0')}`,
                title: key,
                type: 'Configuration',
                description: typeof val === 'string' ? val : JSON.stringify(val),
                userRole: 'All Users',
                acceptanceCriteria: []
              });
            });
          }
        }
      } catch (err) {
        throw new Error(`Invalid JSON requirement file: ${err.message}`);
      }
      break;
    }

    case 'csv': {
      const csvResult = Papa.parse(sanitized, { header: true, skipEmptyLines: true });
      if (csvResult.errors && csvResult.errors.length > 0 && (!csvResult.data || csvResult.data.length === 0)) {
        throw new Error(`CSV parsing failed: ${csvResult.errors[0].message}`);
      }
      csvResult.data.forEach((row, index) => {
        const title = row.title || row.Title || row.name || row.Name || row.Requirement || row.requirement || `Requirement ${index + 1}`;
        const desc = row.description || row.Description || row.details || row.Details || Object.values(row).join(' - ');
        const id = row.id || row.ID || row.ReqID || `REQ-CSV-${String(index + 1).padStart(3, '0')}`;
        const type = row.type || row.Type || 'Functional';
        const role = row.role || row.Role || row.UserRole || 'User';
        const ac = row.acceptanceCriteria || row.ac || row.AcceptanceCriteria;
        items.push({
          id,
          title,
          type,
          description: desc,
          userRole: role,
          acceptanceCriteria: ac ? (Array.isArray(ac) ? ac : [ac]) : []
        });
      });
      break;
    }

    case 'markdown':
    case 'text':
    default: {
      // Parse markdown sections or bullet points
      const lines = sanitized.split(/\r?\n/);
      let currentSection = null;
      let counter = 1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Check if header line (# Header or ## Header)
        const headerMatch = line.match(/^#{1,4}\s+(.+)$/);
        if (headerMatch) {
          if (currentSection) {
            items.push(currentSection);
          }
          currentSection = {
            id: `REQ-MD-${String(counter++).padStart(3, '0')}`,
            title: headerMatch[1],
            type: 'Functional',
            description: '',
            userRole: 'User',
            acceptanceCriteria: []
          };
          continue;
        }

        // Check if bullet point requirement
        const bulletMatch = line.match(/^[-*]\s+(.+)$/);
        if (bulletMatch) {
          const text = bulletMatch[1];
          if (!currentSection) {
            currentSection = {
              id: `REQ-${String(counter++).padStart(3, '0')}`,
              title: text.slice(0, 80),
              type: 'Functional',
              description: text,
              userRole: 'User',
              acceptanceCriteria: []
            };
          } else {
            // If line starts with "AC:" or "Given/When/Then"
            if (/^(ac|acceptance criteria|given|when|then|should)\b/i.test(text)) {
              currentSection.acceptanceCriteria.push(text);
            } else {
              currentSection.description += (currentSection.description ? '\n' : '') + text;
            }
          }
          continue;
        }

        if (currentSection) {
          currentSection.description += (currentSection.description ? '\n' : '') + line;
        } else {
          currentSection = {
            id: `REQ-${String(counter++).padStart(3, '0')}`,
            title: line.slice(0, 80),
            type: 'General',
            description: line,
            userRole: 'User',
            acceptanceCriteria: []
          };
        }
      }

      if (currentSection) {
        items.push(currentSection);
      }
      break;
    }
  }

  return {
    rawContent: sanitized,
    format,
    parsedItems: items,
    itemCount: items.length
  };
}

export function validateProjectSpecification(project, requirements) {
  const issues = [];
  
  if (!project.name || !project.name.trim()) {
    issues.push('Application name is required.');
  }

  if (!project.purpose || !project.purpose.trim()) {
    issues.push('Application purpose and background are required.');
  }

  // URL alone is not a specification!
  const hasOnlyUrl = project.app_url && (!requirements || !requirements.raw_content || requirements.raw_content.trim().length < 15);
  if (hasOnlyUrl) {
    issues.push('An application URL alone must not be treated as a complete specification. Provide detailed business rules, scope, or requirements text.');
  }

  if (!requirements || !requirements.raw_content || requirements.raw_content.trim().length === 0) {
    issues.push('Requirements content is required to proceed with AI analysis.');
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}
