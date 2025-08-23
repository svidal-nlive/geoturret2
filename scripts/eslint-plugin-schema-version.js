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
            if (typeof node.value === 'number') {
              const CURRENT = 7;
              if (node.value === CURRENT) {
                const parent = node.parent;
                const fname = filename;
                const looksSchemaFile = /serialization|snapshot|save|load/i.test(fname);
                if (looksSchemaFile && parent && ((parent.type === 'Property' && parent.key && parent.key.name === 'version') || parent.type === 'BinaryExpression' || parent.type === 'AssignmentExpression')) {
                  context.report({ node, message: `Hard-coded schema version ${CURRENT} detected; import and use SCHEMA_VERSION.` });
                }
              }
            }
          }
        };
      }
    }
  }
};
