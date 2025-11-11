// lib/rules.ts
export type Rule = { id: string; description: string; enabled: boolean; };

export const rules: Rule[] = [
  // 例: { id: "min-length", description: "最低文字数を満たすこと", enabled: true },
];

export default rules;

// ★ これを追加（alias）：route.ts が期待する名前を用意
export const ruleInterpret = rules;
