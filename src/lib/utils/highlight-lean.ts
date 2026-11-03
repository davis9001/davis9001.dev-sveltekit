/**
 * A highlight.js grammar for Lean 4. highlight.js ships none, so this covers
 * what shows up in posts: declarations, tactic proofs, comments, the unicode
 * logic symbols and capitalised type names. It is a colouring aid, not a
 * parser, so it errs toward leaving a word plain.
 */
import type { HLJSApi, Language } from 'highlight.js';

const KEYWORDS =
	'theorem lemma def abbrev instance structure inductive class namespace section end open ' +
	'import variable universe example axiom noncomputable private protected partial unsafe ' +
	'where deriving extends mutual macro syntax notation infix infixl infixr prefix postfix ' +
	'set_option attribute export local scoped fun match with if then else let have show from ' +
	'at by do return for in while break continue try catch finally calc suffices obtain ' +
	'termination_by decreasing_by sorry';

const TACTICS =
	'intro intros exact apply refine use constructor cases rcases rintro induction rw simp ' +
	'simp_all omega decide rfl trivial contradiction exfalso assumption linarith norm_num ring ' +
	'unfold split rename_i generalize revert specialize subst funext congr ext first repeat ' +
	'all_goals any_goals native_decide aesop';

export default function lean(hljs: HLJSApi): Language {
	return {
		name: 'Lean',
		aliases: ['lean4'],
		keywords: {
			$pattern: /[A-Za-z_][\w'!?]*/,
			keyword: KEYWORDS,
			built_in: TACTICS,
			literal: 'true false'
		},
		contains: [
			{ scope: 'comment', begin: '/-', end: '-/', contains: ['self'] },
			hljs.COMMENT('--', '$'),
			hljs.QUOTE_STRING_MODE,
			{ scope: 'number', begin: /\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?)\b/ },
			{ scope: 'meta', begin: /@\[/, end: /\]/ },
			{
				// `theorem name`, `def name`, … : colour the declared name.
				begin: [
					/\b(?:theorem|lemma|def|abbrev|instance|structure|inductive|class|axiom)/,
					/\s+/,
					/[A-Za-z_][\w.'!?]*/
				],
				scope: { 1: 'keyword', 3: 'title.function' }
			},
			{ scope: 'type', begin: /\b[A-Z][\w']*/ },
			{ scope: 'symbol', begin: /\.[a-z_][\w']*/, relevance: 0 },
			{ scope: 'operator', begin: /:=|=>|[∀∃λ→←↔≤≥≠∧∨¬⊢∈∉∪∩⊆×∘↦⟨⟩]/, relevance: 0 }
		]
	};
}
