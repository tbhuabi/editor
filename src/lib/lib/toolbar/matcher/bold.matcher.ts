import { FormatMatcher } from './format.matcher';
import { boldFormatter } from '../../formatter/bold.formatter';
import { Renderer, TBSelection } from '../../core/_api';
import { SelectionMatchDelta } from './matcher';
import { HighlightState } from '../../toolbar/help';
import { BlockMatcher } from './block.matcher';
import { BlockTemplate } from '../../templates/block.template';

export class BoldMatcher extends FormatMatcher {
  private contextMatcher = new BlockMatcher(BlockTemplate)

  constructor() {
    super(boldFormatter);
  }

  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchDelta {
    const result = super.queryState(selection, renderer);
    if (result.state !== HighlightState.Normal) {
      return result;
    }
    const contextMatchResult = this.contextMatcher.queryState(selection, renderer);
    if (contextMatchResult.state === HighlightState.Highlight &&
      /h[1-6]/i.test((contextMatchResult.matchData as BlockTemplate)?.tagName)) {
      return contextMatchResult;
    }
    return result;
  }
}
