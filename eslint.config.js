// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist/**", "coverage/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  // eslint-plugin-security não publica tipos — argumento "any" aqui é
  // inerente ao pacote, não um erro real de tipagem do projeto.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  security.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          // eslint.config.js não faz parte do build/typecheck (tsconfig.json
          // é estrito demais para um arquivo de config sem tipos de terceiros)
          // — projeto default só para ele.
          allowDefaultProject: ["eslint.config.js"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Regra de negócio nunca deveria lançar erro solto — força a hierarquia AppError.
      "@typescript-eslint/no-throw-literal": "off",
      "@typescript-eslint/only-throw-error": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
      "security/detect-object-injection": "off",
    },
  },
  {
    files: ["tests/**/*.ts", "src/**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
    },
  },
  prettier,
);
