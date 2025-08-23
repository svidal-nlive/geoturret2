// Flat config bridge for ESLint v9 consuming existing .eslintrc.cjs style config.
// Imports the legacy config object and adapts to flat format.
const legacy = require('./.eslintrc.cjs');
delete legacy.root;

const { parser, parserOptions, plugins, rules, ignorePatterns } = legacy;
// Inline custom rule (schema-version/no-hardcoded) without plugin indirection for flat config
// Define rule factory inline via dynamic plugin object
function schemaVersionPlugin() {
  return {
    rules: {
      'no-hardcoded': {
        meta: { type: 'problem', docs: { description: 'Disallow hard-coded snapshot schema version numerals; use SCHEMA_VERSION.' } },
        create(context) {
          const filename = context.getFilename();
          const allow = /serialization(\.schemaVersion)?\.test\.ts$/.test(filename) || /serialization\.ts$/.test(filename) || /node_modules/.test(filename) || /eslint-plugin-schema-version/.test(filename) || /eslint\.config\.cjs$/.test(filename);
          return {
            Literal(node) {
              if (allow) return;
              if (typeof node.value === 'number' && node.value === 4) {
                const parent = node.parent;
                if (parent && ((parent.type === 'Property' && parent.key && parent.key.name === 'version') || parent.type === 'BinaryExpression' || parent.type === 'AssignmentExpression')) {
                  context.report({ node, message: 'Hard-coded schema version 4 detected; import and use SCHEMA_VERSION.' });
                }
              }
            }
          };
        }
      }
    }
  };
}

module.exports = [
  // Ignore patterns translated to an early config block with ignores
  ignorePatterns ? { ignores: [...ignorePatterns, 'coverage/**'] } : { ignores: ['coverage/**'] },
  {
    files: ['**/*.ts','**/*.tsx','**/*.js','**/*.cjs','**/*.mjs'],
    ignores: ['coverage/**','dist/**','dist-baseline/**','scripts/eslint-plugin-schema-version.js','eslint.config.cjs'],
  languageOptions: { parser: parser ? require(parser) : undefined, parserOptions },
  plugins: { ...(plugins?.reduce((acc, name) => { try { acc[name] = require(name); } catch {} return acc; }, {}) || {}), 'schema-version': schemaVersionPlugin() },
  rules: { ...rules, 'schema-version/no-hardcoded': ['error'] },
    linterOptions: {},
  }
];