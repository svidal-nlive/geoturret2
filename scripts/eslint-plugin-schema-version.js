// Lightweight custom ESLint rule to prevent hard-coded snapshot schema version numbers
// outside of approved files. Enforces use of SCHEMA_VERSION constant.
// Usage: added via .eslintrc.cjs under rules: 'schema-version/no-hardcoded': 'error'
module.exports = {
  rules: {
    'no-hardcoded': {
      meta: {
        type: 'problem',
        docs: { description: 'Disallow hard-coded snapshot schema version numerals; use SCHEMA_VERSION.' },
        schema: []
      },
      create(context) {
        const filename = context.getFilename();
        const allow = /serialization(\.schemaVersion)?\.test\.ts$/.test(filename) || /serialization\.ts$/.test(filename) || /node_modules/.test(filename);
        return {
          Literal(node) {
            if (allow) return;
            if (typeof node.value === 'number' && node.value === 4) {
              // Heuristic: ensure it's part of a property assignment to 'version' or comparison etc.
              const parent = node.parent;
              if (parent && (
                (parent.type === 'Property' && parent.key && parent.key.name === 'version') ||
                parent.type === 'BinaryExpression' || parent.type === 'AssignmentExpression'
              )) {
                context.report({ node, message: 'Hard-coded schema version 4 detected; import and use SCHEMA_VERSION.' });
              }
            }
          }
        };
      }
    }
  }
};
